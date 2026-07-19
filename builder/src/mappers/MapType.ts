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

import { OpenArabDictPOSType } from "@aczwink/openarabdict-domain";
import { GenderedWordDefinition, MultiSenseVerbDefinition, OtherWordDefinition, POSDefinition, VerbWordDefinition, WordDefinition } from "../DataDefinitions";
import { WordDefinitionValidator } from "../validation/WordDefinitionValidator";

function MapTypeFromDefinition(wordDef: GenderedWordDefinition | OtherWordDefinition | VerbWordDefinition | POSDefinition | MultiSenseVerbDefinition): OpenArabDictPOSType | undefined
{
    switch(wordDef.type)
    {
        case undefined:
            return undefined;
        case "adjective":
            return OpenArabDictPOSType.Adjective;
        case "adverb":
            return OpenArabDictPOSType.Adverb;
        case "conjunction":
            return OpenArabDictPOSType.Conjunction;
        case "foreign-verb":
            return OpenArabDictPOSType.ForeignVerb;
        case "interjection":
            return OpenArabDictPOSType.Interjection;
        case "noun":
            return OpenArabDictPOSType.Noun;
        case "numeral":
            return OpenArabDictPOSType.Numeral;
        case "particle":
            return OpenArabDictPOSType.Particle;
        case "phrase":
            return OpenArabDictPOSType.Phrase;
        case "preposition":
            return OpenArabDictPOSType.Preposition;
        case "pronoun":
            return OpenArabDictPOSType.Pronoun;
        case "proper-noun":
            return OpenArabDictPOSType.ProperNoun;
        case "verb":
            return OpenArabDictPOSType.Verb;
        default:
            throw new Error("Unknown word type: " + (wordDef as any).type);
    }
}

export function MapType(wordDef: WordDefinition, validator: WordDefinitionValidator)
{
    if("pos" in wordDef)
    {
        for (let i = 0; i < wordDef.pos.length; i++)
        {
            const pos = wordDef.pos[i];
            validator.Sense(0).LexicalUnit(i).type = MapTypeFromDefinition(pos);
        }
    }
    else if("type" in wordDef)
    {
        validator.type = MapTypeFromDefinition(wordDef);
    }
}