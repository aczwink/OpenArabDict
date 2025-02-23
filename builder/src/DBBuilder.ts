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
import { OpenArabDictDialect, OpenArabDictDocument, OpenArabDictRoot, OpenArabDictWord, OpenArabDictWordRelation, OpenArabDictWordRelationshipType } from "openarabdict-domain";
import { Dictionary } from "acts-util-core";

export class DBBuilder
{
    constructor()
    {
        this.dialectMap = {};
        this.dialects = [];
        this.relations = [];
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

    public AddRelation(word1Id: number, word2Id: number, relationship: OpenArabDictWordRelationshipType)
    {
        this.relations.push({
            word1Id,
            word2Id,
            relationship
        });
    }

    public AddRoot(radicals: string, ya?: boolean)
    {
        const id = this.roots.length + 1;
        this.roots.push({
            id,
            radicals: radicals.split("-").join(""),
            ya
        });

        return id;
    }

    public AddWord(word: OpenArabDictWord)
    {
        word.id = this.words.length + 1;
        this.words.push(word);

        return word.id;
    }

    public FindWord(criteria: { text: string; })
    {
        function filterWord(word: OpenArabDictWord)
        {
            return word.text === criteria.text;
        }

        const words = this.words.filter(filterWord);
        if(words.length === 1)
            return words[0].id;
        if(words.length === 0)
        {
            console.log(criteria);
            throw new Error("Could not find word");
        }
        throw new Error("TODO");
    }

    public GetRoot(rootId: number)
    {
        return this.roots.find(x => x.id === rootId)!;
    }

    public GetWord(wordId: number)
    {
        return this.words.find(x => x.id === wordId)!;
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
            words: this.words,
            wordRelations: this.relations
        };
        //const stringified = JSON.stringify(finalDB, undefined, 2);
        const stringified = JSON.stringify(finalDB);

        await fs.promises.writeFile(path, stringified, "utf-8");
    }

    //State
    private dialectMap: Dictionary<number>;
    private dialects: OpenArabDictDialect[];
    private relations: OpenArabDictWordRelation[];
    private roots: OpenArabDictRoot[];
    private words: OpenArabDictWord[];
}
