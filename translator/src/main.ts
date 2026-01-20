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
import { OpenArabDictDocument, OpenArabDictTranslationEntry } from "openarabdict-domain";
import { ENV } from "./env";
import { AzureTranslator_Translate } from "./azure-translator";
import { AzureOpenAI_Translate } from "./azure-openai";
import { TargetTranslationLanguage, TranslationError } from "./shared";

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

async function TranslateDict(sourcePath: string, targetLanguage: string, targetPath: string)
{
    const textData = await fs.promises.readFile(sourcePath, "utf-8");
    const data = JSON.parse(textData) as OpenArabDictDocument;

    const fetchTranslation = ResolveTranslationFunction();

    let i = 0;
    for (const word of data.words)
    {
        console.log(++i, "/", data.words.length, word.id);
        if(word.translations.IsEmpty())
            continue;

        const translated = await fetchTranslation(word.translations, targetLanguage as TargetTranslationLanguage);
        if(Array.isArray(translated))
            word.translations = translated;
        else
            throw new Error("Translation failed: " + translated);
    }

    await fs.promises.writeFile(targetPath, JSON.stringify(data), "utf-8");
}

TranslateDict(process.argv[2], process.argv[3], process.argv[4]);