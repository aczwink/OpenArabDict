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
import { Verb } from "openarabicconjugation/dist/Verb";

export class VerbalNounCounter
{
    constructor()
    {
        this.dict = {};
    }

    public Evaluate()
    {
        for (const key in this.dict)
        {
            const counts = this.dict[key]!;
            for (let i = 0; i < counts.length; i++)
            {
                if(counts[i] === 0)
                {
                    console.log("Verbal noun is never generated: " + i, key);
                }
            }
        }
    }

    public Increment(verb: Verb<string>, index: number, verbalNounCount: number)
    {
        const stemParams = (verb.stem === 1) ? verb.stemParameterization : "";
        const key = [verb.type, verb.stem, stemParams].join("_");
        const entry = this.dict[key];

        if(entry === undefined)
        {
            const counts = [];
            for (let i = 0; i < verbalNounCount; i++)
                counts.push(0);
            counts[index]++;

            this.dict[key] = counts;
        }
        else
        {
            //TODO: this should be fixed in openarabicconjugation
            /*if(entry.length !== verbalNounCount)
                throw new Error("Verbal noun count can not change: " + key);*/
            entry[index]++;
        }
    }

    //State
    private dict: Dictionary<number[]>;
}