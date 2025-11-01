/**
 * OpenArabDict
 * Copyright (C) 2025 Amir Czwink (amir130@hotmail.de)
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
import { AbsURL } from "acts-util-core";
import { HTTP } from "acts-util-node";
import { OpenArabDictDocument, OpenArabDictTranslationEntry } from "openarabdict-domain";

export type TargetTranslationLanguage = "de";

const ENV = {
    key: process.env.ARABDICT_TRANSLATIONSERVICE_KEY!,
    region: process.env.ARABDICT_TRANSLATIONSERVICE_REGION!,
};

async function CallTranslationService(texts: string[], targetLanguage: TargetTranslationLanguage)
{
    const body = Buffer.from(JSON.stringify(texts.map(x => ({ Text: x }))));

    //instead of azure services, also libretranslate could be an option (https://libretranslate.com)

    const headers: any = {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": ENV.key,
        "Ocp-Apim-Subscription-Region": ENV.region
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

async function FetchTranslation(translations: OpenArabDictTranslationEntry[], targetLanguage: TargetTranslationLanguage)
{
    const texts: string[] = [];

    for (const entry of translations)
    {
        if(entry.contextual !== undefined)
        {
            for (const subEntry of entry.contextual)
            {
                texts.push(subEntry.translation);
            }
        }

        if(entry.examples !== undefined)
        {
            for (const subEntry of entry.examples)
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

        if(entry.contextual !== undefined)
        {
            const ctx = [];
            for (const subEntry of entry.contextual)
            {
                ctx.push({
                    text: subEntry.text,
                    translation: resultTexts[0]
                });
                resultTexts.Remove(0);
            }
            resultingEntry.contextual = ctx;
        }

        if(entry.examples !== undefined)
        {
            const ctx = [];
            for (const subEntry of entry.examples)
            {
                ctx.push({
                    text: subEntry.text,
                    translation: resultTexts[0]
                });
                resultTexts.Remove(0);
            }
            resultingEntry.examples = ctx;
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

async function TranslateDict(sourcePath: string, targetLanguage: string, targetPath: string)
{
    const textData = await fs.promises.readFile(sourcePath, "utf-8");
    const data = JSON.parse(textData) as OpenArabDictDocument;

    let i = 0;
    for (const word of data.words)
    {
        console.log(++i, "/", data.words.length);
        const translated = await FetchTranslation(word.translations, targetLanguage as any);
        word.translations = translated;
    }

    await fs.promises.writeFile(targetPath, JSON.stringify(data), "utf-8");
}

TranslateDict(process.argv[2], process.argv[3], process.argv[3]);
