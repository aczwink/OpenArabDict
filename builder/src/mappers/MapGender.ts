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
import { OpenArabDictGender } from "@aczwink/openarabdict-domain";
import { GenderedWordDefinition, WordDefinition } from "../DataDefinitions";
import { WordDefinitionValidator } from "../validation/WordDefinitionValidator";

function MapGenderValue(word: GenderedWordDefinition)
{
    switch(word.gender)
    {
        case "female":
            return OpenArabDictGender.Female;
        case "male":
            return OpenArabDictGender.Male;
        case "male-or-female":
            return OpenArabDictGender.FemaleOrMale;
        default:
            throw new Error("Unknown gender: " + (word as any).gender);
    }
}

export function MapGender(wordDef: WordDefinition, validator: WordDefinitionValidator)
{
    if("gender" in wordDef)
    {
        const gender = MapGenderValue(wordDef);
        validator.Sense(0).LexicalUnit(0).InferValue("gender", gender);
    }
}