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
import fs from "fs";
import { OpenArabDictDialect, OpenArabDictDocument, OpenArabDictRoot, OpenArabDictWord } from "openarabdict-domain";
import { Dictionary } from "../../../ACTS-Util/core/dist/Dictionary";

export class DBBuilder
{
    constructor()
    {
        this.dialectMap = {};
        this.dialects = [];
        this.roots = [];
        this.words = [];
    }

    //Public methods
    public AddDialect(key: string, name: string, emojiCodes: string, glottoCode: string, iso639code: string, parentId: number | null)
    {
        const id = this.dialects.length + 1;
        this.dialectMap[key] = id;
        this.dialects.push({
            id,
            name,
            emojiCodes,
            glottoCode,
            iso639code,
            parentId
        });

        return id;
    }

    public AddRoot(radicals: string)
    {
        const id = this.roots.length + 1;
        this.roots.push({
            id,
            radicals: radicals.split("-").join("")
        });

        return id;
    }

    public AddWord(word: OpenArabDictWord)
    {
        word.id = this.words.length + 1;
        this.words.push(word);
    }

    public MapDialectKey(dialectKey: string)
    {
        return this.dialectMap[dialectKey];
    }

    public async Store(path: string)
    {
        const finalDB: OpenArabDictDocument = {
            dialects: this.dialects,
            roots: this.roots,
            words: this.words
        };
        const stringified = JSON.stringify(finalDB, undefined, 2);

        await fs.promises.writeFile(path, stringified, "utf-8");
    }

    //State
    private dialectMap: Dictionary<number>;
    private dialects: OpenArabDictDialect[];
    private roots: OpenArabDictRoot[];
    private words: OpenArabDictWord[];
}