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

import { OpenArabDictWord, OpenArabDictWordParentType, OpenArabDictNonVerbDerivationType } from "@aczwink/openarabdict-domain";
import { Tashkil } from "@aczwink/openarabicconjugation/dist/Definitions";

export const WordLogic = {
    IsNounInNominative(word: OpenArabDictWord)
    {
        return word.text.endsWith(Tashkil.Fathatan) || word.text.endsWith(Tashkil.Kasratan);
    },

    IsSingular(word: OpenArabDictWord)
    {
        if(word.parent !== undefined)
        {
            if(word.parent.type === OpenArabDictWordParentType.NonVerbWord)
                return word.parent.relationType !== OpenArabDictNonVerbDerivationType.Plural;
        }
        return true;
    }
};