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
import fs from "fs";
import path from "path";
import { OpenArabDictTranslationDocument } from "@aczwink/openarabdict-domain";
import { ENV } from "./env";
import { Dictionary } from "@aczwink/acts-util-core";
import { CachedTranslator } from "./translator/CachedTranslator";
import { TargetTranslationLanguage, Translator } from "./Translator";
import { AzureTranslator } from "./translator/azure-translator";
import { AzureOpenAITranslator } from "./translator/azure-openai";
import { FallbackTranslator } from "./translator/FallbackTranslator";
import { EmptyTranslationsTranslator } from "./translator/EmptyTranslationsTranslator";
import { ThrottledTranslator } from "./translator/ThrottledTranslator";

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

function ResolveTranslationFunction(): Translator
{
    switch(ENV.implementation)
    {
        case "azure-translator":
            return new AzureTranslator;
        case "azure-openai":
            return new AzureOpenAITranslator;
        case "azure-openai-azure-translator-fallback":
            return new FallbackTranslator(
                new AzureOpenAITranslator,
                new AzureTranslator
            );
        //also libretranslate could be an option (https://libretranslate.com)
    }
}

interface TranslateDictInput
{
    databasePath: string;
    maxTranslations?: number;
    targetLanguage: TargetTranslationLanguage;
}

export async function TranslateDict(input: TranslateDictInput)
{
    const sourceLanguage = "en";

    const databasePath = input.databasePath;
    const targetLanguage = input.targetLanguage;

    const sourceDictPath = path.join(databasePath, sourceLanguage + ".json");
    const targetDictPath = path.join(databasePath, targetLanguage + ".json");
    const mappingDictPath = path.join(databasePath, "mapping_" + sourceLanguage + "2" + targetLanguage + ".json");

    const english = (await LoadFileIfExisting<OpenArabDictTranslationDocument>(sourceDictPath))!;

    const throttle = new ThrottledTranslator(
        ResolveTranslationFunction(),
        input.maxTranslations
    );
    const cache = new CachedTranslator(
        await LoadMapping(mappingDictPath),
        await LoadTargetDict(targetDictPath),
        throttle
    );
    const translator = new EmptyTranslationsTranslator(cache);

    let i = 0;
    const targetTranslations: OpenArabDictTranslationDocument = { entries: [] };
    for (const entry of english.entries)
    {
        i++;
        console.log(i, "/", english.entries.length, entry.lexicalUnitId);

        const translated = await translator.Translate(entry.lexicalUnitId, entry.translations, targetLanguage);
        if(Array.isArray(translated))
            targetTranslations.entries.push({ lexicalUnitId: entry.lexicalUnitId, translations: translated });
        else
            throw new Error("Translation failed: " + translated);
    }

    await fs.promises.writeFile(targetDictPath, JSON.stringify(targetTranslations), "utf-8");
    await fs.promises.writeFile(mappingDictPath, JSON.stringify(cache.targetMapping), "utf-8");

    return throttle.translatedCount;
}