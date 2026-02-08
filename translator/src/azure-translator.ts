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
import { AbsURL } from "@aczwink/acts-util-core";
import { HTTP } from "@aczwink/acts-util-node";
import { OpenArabDictTranslationEntry } from "@aczwink/openarabdict-domain";
import { ENV } from "./env";
import { TargetTranslationLanguage } from "./shared";

async function CallTranslationService(texts: string[], targetLanguage: TargetTranslationLanguage)
{
    const body = Buffer.from(JSON.stringify(texts.map(x => ({ Text: x }))));

    const headers: any = {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": ENV.azureTranslator.key,
        "Ocp-Apim-Subscription-Region": ENV.azureTranslator.region
    };

    const sender = new HTTP.RequestSender;
    const response = await sender.SendRequest({
        body,
        headers,
        method: "POST",
        url: AbsURL.Parse("https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=" + targetLanguage),
    });

    if(response.statusCode !== 200)
    {
        console.log(texts);
        console.log(response.body.toString("utf-8"));
        throw new Error("TODO: fix me");
    }
    const parsed = JSON.parse(response.body.toString("utf-8")) as any[];

    return parsed.Values().Map(x => (x.translations as any[]).Values()).Flatten().Map(x => x.text as string).ToArray();
}

export async function AzureTranslator_Translate(translations: OpenArabDictTranslationEntry[], targetLanguage: TargetTranslationLanguage)
{
    const texts: string[] = [];

    for (const entry of translations)
    {
        if(entry.usage !== undefined)
        {
            for (const subEntry of entry.usage)
            {
                texts.push(subEntry.translation);
            }
        }

        texts.push(...entry.text);
    }

    if(texts.length === 0)
        return translations;

    const resultTexts = await CallTranslationService(texts, targetLanguage);

    const result: OpenArabDictTranslationEntry[] = [];

    for (const entry of translations)
    {
        const resultingEntry: OpenArabDictTranslationEntry = {
            dialectId: entry.dialectId,
            complete: entry.complete,
            url: entry.url,
            text: [],
        };

        if(entry.usage !== undefined)
        {
            const ctx = [];
            for (const subEntry of entry.usage)
            {
                ctx.push({
                    text: subEntry.text,
                    translation: resultTexts[0],
                    type: subEntry.type
                });
                resultTexts.Remove(0);
            }
            resultingEntry.usage = ctx;
        }

        for (const _ of entry.text)
        {
            resultingEntry.text.push(resultTexts[0]);
            resultTexts.Remove(0);
        }

        result.push(resultingEntry);
    }
    
    return result;
}