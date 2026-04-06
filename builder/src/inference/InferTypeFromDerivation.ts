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

import { OpenArabDictParentType, OpenArabDictWordType } from "@aczwink/openarabdict-domain";
import { WordDefinitionValidator } from "../WordDefinitionValidator";

export function InferTypeFromDerivation(validator: WordDefinitionValidator)
{
    for (const parent of validator.parents)
    {
        switch(parent.type)
        {
            case OpenArabDictParentType.ElativeDegree:
            case OpenArabDictParentType.Nisba:
                validator.InferAnyOf("type", [OpenArabDictWordType.Adjective, OpenArabDictWordType.Noun], OpenArabDictWordType.Adjective);
                break;
            case OpenArabDictParentType.CharacteristicNoun:
                validator.InferValue("type", OpenArabDictWordType.Noun);
                break;
        }
    }
}