/**
 * OpenArabDict
 * Copyright (C) 2025-2026 Amir Czwink (amir130@hotmail.de)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { OpenArabDictTranslationDocument, OpenArabDictTranslationEntry } from "@aczwink/openarabdict-domain";
import { ENV } from "./env";
import { AzureTranslator_Translate } from "./azure-translator";
import { AzureOpenAI_Translate } from "./azure-openai";
import { TargetTranslationLanguage, TranslationError } from "./shared";
import { Dictionary } from "@aczwink/acts-util-core";

function ComputeLookupTable(targetTranslations: OpenArabDictTranslationDocument)
{
    const dict: Dictionary<number> = {};
    for(let i = 0; i < targetTranslations.entries.length; i++)
    {
        const entry = targetTranslations.entries[i];
        dict[entry.wordId] = i;
    }
    return dict;
}

function ComputeMappingHash(translations: OpenArabDictTranslationEntry[])
{
    const text = JSON.stringify(translations);

    return crypto.createHash("md5").update(text).digest("hex");
}

async function LoadFileIfExisting<T>(filePath: string)
{
    try
    {
        const textData = await fs.promises.readFile(filePath, "utf-8");
        return JSON.parse(textData) as T;
    }
    catch(e: any)
    {
        if(e?.code === "ENOENT")
            return undefined;
        throw e;
    }
}

async function LoadMapping(mappingDictPath: string): Promise<Dictionary<string>>
{
    const data = await LoadFileIfExisting<Dictionary<string>>(mappingDictPath);
    if(data === undefined)
        return {};
    return data;
}

async function LoadTargetDict(targetDictPath: string): Promise<OpenArabDictTranslationDocument>
{
    const data = await LoadFileIfExisting<OpenArabDictTranslationDocument>(targetDictPath);
    if(data === undefined)
    {
        return {
            entries: []
        };
    }
    return data;
}

function ResolveTranslationFunction(): (translations: OpenArabDictTranslationEntry[], targetLanguage: TargetTranslationLanguage) => Promise<OpenArabDictTranslationEntry[] | TranslationError>
{
    switch(ENV.implementation)
    {
        case "azure-translator":
            return AzureTranslator_Translate;
        case "azure-openai":
            return AzureOpenAI_Translate;
        case "azure-openai-azure-translator-fallback":
            return async (translations: OpenArabDictTranslationEntry[], targetLanguage: TargetTranslationLanguage) => {
                const result = await AzureOpenAI_Translate(translations, targetLanguage);
                if(Array.isArray(result))
                    return result;
                return AzureTranslator_Translate(translations, targetLanguage);
            };
        //also libretranslate could be an option (https://libretranslate.com)
    }
}

async function TranslateDict(databasePath: string, targetLanguage: TargetTranslationLanguage)
{
    const sourceLanguage = "en";

    const sourceDictPath = path.join(databasePath, sourceLanguage + ".json");
    const targetDictPath = path.join(databasePath, targetLanguage + ".json");
    const mappingDictPath = path.join(databasePath, "mapping_" + sourceLanguage + "2" + targetLanguage + ".json");

    const fetchTranslation = ResolveTranslationFunction();

    const english = (await LoadFileIfExisting<OpenArabDictTranslationDocument>(sourceDictPath))!;
    const targetTranslations = await LoadTargetDict(targetDictPath);
    const mapping = await LoadMapping(mappingDictPath);
    const lookupTable = ComputeLookupTable(targetTranslations);

    let i = 0;
    for (const entry of english.entries)
    {
        console.log(++i, "/", english.entries.length, entry.wordId);
        if(entry.translations.IsEmpty())
            continue;

        const computedHash = ComputeMappingHash(entry.translations);

        const storedHash = mapping[entry.wordId];
        if(computedHash === storedHash)
            continue;

        const translated = await fetchTranslation(entry.translations, targetLanguage);
        if(Array.isArray(translated))
        {
            const index = lookupTable[entry.wordId];
            if(index === undefined)
                targetTranslations.entries.push({ wordId: entry.wordId, translations: translated });
            else
                targetTranslations.entries[index].translations = translated;
            mapping[entry.wordId] = computedHash;
        }
        else
            throw new Error("Translation failed: " + translated);

        break;
    }

    await fs.promises.writeFile(targetDictPath, JSON.stringify(targetTranslations), "utf-8");
    await fs.promises.writeFile(mappingDictPath, JSON.stringify(mapping), "utf-8");
}

TranslateDict(process.argv[2], process.argv[3] as TargetTranslationLanguage);