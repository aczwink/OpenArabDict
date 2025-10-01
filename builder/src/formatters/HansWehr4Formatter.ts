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

import { TranslationDefinition } from "../DataDefinitions";

//https://thearabicpages.com/2020/12/06/reference-a-list-of-abbreviations-in-the-hans-wehr-dictionary/
function ReplaceAbbreviations(input: string): string
{
    const abbreviations = [
        { abbrev: "s.o.", text: "someone" },
        { abbrev: "s.th.", text: "something" },
    ];

    for (const entry of abbreviations)
        input = input.ReplaceAll(entry.abbrev, entry.text);

    return input;
}

export function HansWehr4Formatter(x: TranslationDefinition)
{
    if(x.source !== "hw4")
        return;

    if((x.url === undefined) && (x["source-page"] !== undefined))
    {
        const ejtaalPage = x["source-page"] + 13;
        x.url = "https://ejtaal.net/aa/#hw4=" + ejtaalPage;
        x["source-page"] = undefined;
    }

    for(let i = 0; i < x.text.length; i++)
    {
        x.text[i] = ReplaceAbbreviations(x.text[i]);
    }
}