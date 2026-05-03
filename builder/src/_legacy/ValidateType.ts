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
import { WordDefinition } from "../DataDefinitions";
import { WordDefinitionValidator } from "../WordDefinitionValidator";

function MapType(word: WordDefinition)
{
    switch(word.type)
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
        case "verb":
            return OpenArabDictPOSType.Verb;
        default:
            throw new Error("Unknown word type: " + (word as any).type);
    }
}

export function ValidateType(validator: WordDefinitionValidator)
{
    validator.type = MapType(validator._legacyWordDefinition)

    switch(validator._legacyWordDefinition.derivation)
    {
        case "adverbial-accusative":
            validator.InferAnyOf("type", [OpenArabDictPOSType.Adverb], OpenArabDictPOSType.Adverb);
            break;
        case "definite-state":
        case "instance-noun":
        case "noun-of-place":
        case "singulative":
        case "tool-noun":
            validator.InferAnyOf("type", [OpenArabDictPOSType.Noun], OpenArabDictPOSType.Noun);
            break;
        case "verbal-noun":
            validator.InferAnyOf("type", [OpenArabDictPOSType.Adjective, OpenArabDictPOSType.Noun], OpenArabDictPOSType.Noun);
            break;
    }
}