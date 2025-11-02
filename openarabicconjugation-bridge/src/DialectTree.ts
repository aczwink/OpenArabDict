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

import { DialectType } from "openarabicconjugation/dist/Dialects";

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

export const DialectTree = {
    HighestOf(dialectTypes: DialectType[])
    {
        const nodes = dialectTypes.map(x => FindNode(x, tree)!);
        const leastLevel = Math.min(...nodes.map(x => x.level))
        return nodes.find(x => x.level === leastLevel)!.dialectType;
    },

    Map(dialectType: DialectType)
    {
        //TODO: DO THIS CORRECTLY
        switch(dialectType)
        {
            case DialectType.Lebanese:
                return 5;
            case DialectType.ModernStandardArabic:
                return 1;
            case DialectType.SouthLevantine:
                return 8;
            default:
                throw new Error("Missing mapping: " + dialectType);
        }
    },

    MapId(dialectId: number)
    {
        //TODO: DO THIS CORRECTLY
        switch(dialectId)
        {
            case 1:
                return DialectType.ModernStandardArabic;
            case 5:
                return DialectType.Lebanese;
            case 8:
                return DialectType.SouthLevantine;
            default:
                return null;
        }
    }
};