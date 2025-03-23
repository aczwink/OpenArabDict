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

import { OpenArabDictWordType } from "openarabdict-domain";
import { WordDefinition } from "../DataDefinitions";
import { WordDefinitionValidator } from "../WordDefinitionValidator";

function MapType(word: WordDefinition)
{
    switch(word.type)
    {
        case undefined:
            return undefined;
        case "adjective":
            return OpenArabDictWordType.Adjective;
        case "adverb":
            return OpenArabDictWordType.Adverb;
        case "conjunction":
            return OpenArabDictWordType.Conjunction;
        case "foreign-verb":
            return OpenArabDictWordType.ForeignVerb;
        case "interjection":
            return OpenArabDictWordType.Interjection;
        case "noun":
            return OpenArabDictWordType.Noun;
        case "numeral":
            return OpenArabDictWordType.Numeral;
        case "particle":
            return OpenArabDictWordType.Particle;
        case "phrase":
            return OpenArabDictWordType.Phrase;
        case "preposition":
            return OpenArabDictWordType.Preposition;
        case "pronoun":
            return OpenArabDictWordType.Pronoun;
        case "verb":
            return OpenArabDictWordType.Verb;
        default:
            throw new Error("Unknown word type: " + (word as any).type);
    }
}

export function ValidateType(validator: WordDefinitionValidator)
{
    validator.type = MapType(validator.wordDefinition)
}