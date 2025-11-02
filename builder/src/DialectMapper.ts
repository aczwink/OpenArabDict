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

import { DialectType, GetAllConjugatableDialects } from "openarabicconjugation/dist/Dialects";
import { GetDialectMetadata } from "openarabicconjugation/dist/DialectsMetadata";
import { Dictionary } from "acts-util-core";

export class DialectMapper
{
    constructor()
    {
        this.map = {};
        this.reverseMap = {};
    }

    public CreateMappingIfPossible(id: number, glottoCode: string, iso639code: string)
    {
        const conjugatable = GetAllConjugatableDialects();
        for (const dialectType of conjugatable)
        {
            const meta = GetDialectMetadata(dialectType);
            if((meta.glottoCode === glottoCode) && (meta.iso639code === iso639code))
            {
                this.map[id] = dialectType;
                this.reverseMap[dialectType] = id;
                return;
            }
        }
    }

    public Map(dialectId: number)
    {
        return this.map[dialectId];
    }

    public MapTypeToId(dialectType: DialectType)
    {
        return this.reverseMap[dialectType]!;
    }

    //State
    private map: Dictionary<DialectType>;
    private reverseMap: Dictionary<number>;
}
