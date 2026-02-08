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
import { OpenArabDictWordType } from "@aczwink/openarabdict-domain";
import { WordDefinitionValidator } from "../WordDefinitionValidator";

export function ValidateFeminine(validator: WordDefinitionValidator)
{
    if((validator.wordDefinition.derivation === "feminine") && (validator.parent !== undefined))
    {
        if(validator.parent.type !== "word")
            throw new Error("Plurals can only be derived from words");

        validator.Infer("type", [OpenArabDictWordType.Adjective, OpenArabDictWordType.Noun, OpenArabDictWordType.Pronoun], validator.parent.word.type);
        validator.Infer("isMale", [false], false);
    }
}