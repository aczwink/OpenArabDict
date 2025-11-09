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
import { Dictionary } from "acts-util-core";
import { OpenArabDictDialect } from "openarabdict-domain";
import { DialectType, GetAllConjugatableDialects } from "openarabicconjugation/dist/Dialects";
import { GetDialectMetadata } from "openarabicconjugation/dist/DialectsMetadata";

interface DialectNode
{
    dialectType: DialectType;
    level: number;
    children: DialectNode[];
}

const tree: DialectNode = {
    dialectType: DialectType.ModernStandardArabic,
    level: 0,
    children: [
        {
            children: [],
            dialectType: DialectType.Lebanese,
            level: 1
        },
        {
            children: [],
            dialectType: DialectType.SouthLevantine,
            level: 1
        }
    ]
}

function FindNode(dialectType: DialectType, node: DialectNode): DialectNode | null
{
    if(dialectType === node.dialectType)
        return node;
    for (const child of node.children)
    {
        const result = FindNode(dialectType, child);
        if(result !== null)
            return result;
    }

    return null;
}

const map: Dictionary<DialectType> = {};
const reverseMap: Dictionary<number> = {};

export const DialectTree = {
    Define(dialect: OpenArabDictDialect)
    {
        const conjugatable = GetAllConjugatableDialects();
        for (const dialectType of conjugatable)
        {
            const meta = GetDialectMetadata(dialectType);
            if((meta.glottoCode === dialect.glottoCode) && (meta.iso639code === dialect.iso639code))
            {
                map[dialect.id] = dialectType;
                reverseMap[dialectType] = dialect.id;
                return;
            }
        }
    },

    DefineMultiple(dialects: OpenArabDictDialect[])
    {
        for (const dialect of dialects)
            this.Define(dialect);
    },

    HighestOf(dialectTypes: DialectType[])
    {
        const nodes = dialectTypes.map(x => FindNode(x, tree)!);
        const leastLevel = Math.min(...nodes.map(x => x.level))
        return nodes.find(x => x.level === leastLevel)!.dialectType;
    },

    MapIdToType(dialectId: number)
    {
        return map[dialectId];
    },

    MapTypeToId(dialectType: DialectType)
    {
        return reverseMap[dialectType]!;
    },
};