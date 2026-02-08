/**
 * OpenArabDict
 * Copyright (C) 2026 Amir Czwink (amir130@hotmail.de)
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

import { OpenArabDictTranslationEntry, UsageType } from "@aczwink/openarabdict-domain";
import { ENV } from "./env";
import { AbsURL } from "@aczwink/acts-util-core";
import { HTTP } from "@aczwink/acts-util-node";
import { TargetTranslationLanguage, TranslationError } from "./shared";

const examplesMarker = "-$-";
const meaningInContextMarker = "-§-";

function GetUsagesByType(translations: OpenArabDictTranslationEntry[], usageType: UsageType)
{
    return translations.Values().Map(x => x.usage).NotUndefined().Map(x => x.Values()).Flatten().Filter(x => x.type === usageType).ToArray();
}

function MapResult(result: string, inputTranslations: OpenArabDictTranslationEntry[])
{
    const output: OpenArabDictTranslationEntry[] = [];

    const lines = result.split("\n");
    const examplesLineIndex = lines.findIndex(x => x === examplesMarker);
    const contextLineIndex = lines.findIndex(x => x === meaningInContextMarker);

    let textLines;
    let contextLines: string[] = [];
    let examplesLines: string[] = [];
    if((examplesLineIndex === -1) && contextLineIndex === -1)
    {
        textLines = lines;
    }
    else if(examplesLineIndex === -1)
    {
        textLines = lines.slice(0, contextLineIndex);
        contextLines = lines.slice(contextLineIndex + 1);
    }
    else if(contextLineIndex === -1)
    {
        textLines = lines.slice(0, examplesLineIndex);
        examplesLines = lines.slice(examplesLineIndex + 1);
    }
    else
    {
        textLines = lines.slice(0, examplesLineIndex);
        examplesLines = lines.slice(examplesLineIndex + 1, contextLineIndex);
        contextLines = lines.slice(contextLineIndex + 1);
    }

    for (const it of inputTranslations)
    {
        const mappedTexts = textLines.slice(0, it.text.length);
        textLines.splice(0, it.text.length);

        let usage;
        if(it.usage !== undefined)
        {
            usage = [];
            for (const u of it.usage)
            {
                usage.push({
                    ...u,
                    translation: (u.type === UsageType.Example ? examplesLines.shift()! : contextLines.shift()!),
                });
            }
        }

        output.push({
            ...it,
            text: mappedTexts,
            usage,
        });
    }

    return output;
}

function PackInputToString(translations: OpenArabDictTranslationEntry[])
{
    const texts = translations.Values().Map(x => x.text.Values()).Flatten().ToArray();

    const examples = GetUsagesByType(translations, UsageType.Example);
    if(examples.length > 0)
    {
        texts.push(examplesMarker);
        texts.push(...examples.map(x => x.translation));
    }

    const context = GetUsagesByType(translations, UsageType.MeaningInContext);

    if(context.length > 0)
    {
        texts.push(meaningInContextMarker);
        texts.push(...context.map(x => x.translation));
    }

    return texts.join("\n");
}

export async function AzureOpenAI_Translate(translations: OpenArabDictTranslationEntry[], targetLanguage: TargetTranslationLanguage)
{
    const deploymentId = "gpt-4o";

    const body = {
        messages: [
            {
                role: "system",
                content: `
                You are to translate English dictionary translations for the Arabic language to the language defined by code: ${targetLanguage}.
                Since this is a dictionary, you should maintain the form of the input and translate carefully with high accuracy while looking on the context of the whole translation.
                Only translate the input that is present. Never ever fill in any info on your own. Especially, do not invent examples or usage information!
                The input will be structured as follows:
                1. Texts that you should translate separated by lines
                2. (optionally) The special marker ${examplesMarker} followed by the actual examples that you should translate
                3. (optionally) The special marker ${meaningInContextMarker} followed by usage information that you should translate as well

                
                `
            },
            {
                role: "user",
                content: PackInputToString(translations)
            }
        ]
    };
    const headers: any = {
        "api-key": ENV.azureOpenAI.key
    };

    const sender = new HTTP.RequestSender;
    const response = await sender.SendRequest({
        body: Buffer.from(JSON.stringify(body)),
        headers,
        method: "POST",
        url: AbsURL.Parse("https://" + ENV.azureOpenAI.region + ".api.cognitive.microsoft.com/openai/deployments/" + deploymentId + "/chat/completions?api-version=2024-10-21"),
    });

    const responseString = response.body.toString("utf-8");
    const responseData = JSON.parse(responseString);
    if(response.statusCode !== 200)
    {
        if((response.statusCode === 400) && (responseData.error.code === "content_filter"))
            return TranslationError.Filtered;
        console.log(responseData);
        throw new Error("AN ERROR OCCURED: " + responseString);
    }
    const choice = responseData.choices[0];
    if(choice.finish_reason === "content_filter")
        return TranslationError.Filtered;
    const result = choice.message.content;

    return MapResult(result, translations);
}