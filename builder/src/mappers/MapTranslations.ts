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
import { OpenArabDictTranslationEntry, OpenArabDictTranslationUsageType } from "@aczwink/openarabdict-domain";
import { _LegacyBuildUsage } from "../_LegacyDataDefinition";
import { TranslationDefinition, UsageDefinition, WordDefinition } from "../DataDefinitions";
import { DBBuilder } from "../DBBuilder";
import { HansWehr4Formatter } from "../formatters/HansWehr4Formatter";
import { WordDefinitionValidator } from "../validation/WordDefinitionValidator";

function ProcessTranslationDefinition(x: TranslationDefinition, builder: DBBuilder): OpenArabDictTranslationEntry
{
    function MapUsageType(def: UsageDefinition)
    {
        switch(def.type)
        {
            case "example":
                return OpenArabDictTranslationUsageType.Example;
            case "meaning-in-context":
                return OpenArabDictTranslationUsageType.MeaningInContext;
        }
    }

    HansWehr4Formatter(x);
    
    return {
        dialectId: builder.MapDialectKey(x.dialect)!,
        complete: x.complete,
        text: x.text,
        url: x.url,
        usage: x.usage?.map(y => ({ text: y.text, translation: [y.translation], type: MapUsageType(y) })) ?? _LegacyBuildUsage(x)
    };
}

function ProcessTranslationDefinitions(translations: TranslationDefinition[] | undefined, builder: DBBuilder)
{
    return translations?.map(x => ProcessTranslationDefinition(x, builder)) ?? [];
}

export function MapTranslations(builder: DBBuilder, wordDef: WordDefinition, validator: WordDefinitionValidator)
{
    if("pos" in wordDef)
    {
        for (let i = 0; i < wordDef.pos.length; i++)
        {
            const pos = wordDef.pos[i];
            const translations = ProcessTranslationDefinitions(pos.translations, builder);
            validator.Sense(0).LexicalUnit(i).translations = translations; 
        }
    }
    else if("senses" in wordDef)
    {
        for (let i = 0; i < wordDef.senses.length; i++)
        {
            const sense = wordDef.senses[i];
            const translations = ProcessTranslationDefinitions(sense.translations, builder);
            validator.Sense(i).LexicalUnit(0).translations = translations; 
        }
    }
    else
    {
        const translations = ProcessTranslationDefinitions(wordDef.translations, builder);
        validator.Sense(0).LexicalUnit(0).translations = translations;
    }
}