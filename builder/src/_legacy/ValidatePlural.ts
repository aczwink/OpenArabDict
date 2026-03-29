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
import { OpenArabDictGender, OpenArabDictGenderedWord, OpenArabDictWordType } from "@aczwink/openarabdict-domain";
import { WordDefinitionValidator } from "../WordDefinitionValidator";

export function ValidatePlural(validator: WordDefinitionValidator)
{
    if((validator._legacyWordDefinition.derivation === "plural") && (validator.sourceTreeTrace !== undefined))
    {
        if(validator.sourceTreeTrace.type !== "word")
            throw new Error("Plurals can only be derived from words");

        validator.InferAnyOf("type", [OpenArabDictWordType.Adjective, OpenArabDictWordType.Noun, OpenArabDictWordType.Numeral, OpenArabDictWordType.Pronoun], validator.sourceTreeTrace.word.type);
        validator.InferAnyOf("gender", [OpenArabDictGender.Female, OpenArabDictGender.Male], (validator.sourceTreeTrace.word as OpenArabDictGenderedWord).gender);
    }
}