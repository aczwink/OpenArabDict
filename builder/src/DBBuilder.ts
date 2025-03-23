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
import { OpenArabDictDialect, OpenArabDictDocument, OpenArabDictRoot, OpenArabDictWord, OpenArabDictWordRelation, OpenArabDictWordRelationshipType, OpenArabDictWordType } from "openarabdict-domain";
import { Dictionary, ObjectExtensions } from "acts-util-core";
import { Buckwalter } from "openarabicconjugation/dist/Transliteration";
import { ParseVocalizedText } from "openarabicconjugation/dist/Vocalization";

export class DBBuilder
{
    constructor()
    {
        this.dialectMap = {};
        this.dialects = [];
        this.relations = [];
        this.roots = {};
        this.words = {};
        this.wordsWithEqualSpellingDict = {};
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

    public AddRelation(word1Id: string, word2Id: string, relationship: OpenArabDictWordRelationshipType)
    {
        this.relations.push({
            word1Id,
            word2Id,
            relationship
        });
    }

    public AddRoot(radicals: string, ya?: boolean)
    {
        const radicalsWithoutDashes = radicals.split("-").join("");
        const id = this.GenerateRootId(radicalsWithoutDashes);

        if(this.GetRoot(id) !== undefined)
        {
            console.log(radicals);
            throw new Error("Id conflict for: " + id);
        }

        this.roots[id] = {
            id,
            radicals: radicalsWithoutDashes,
            ya
        };

        return id;
    }

    public AddWord(word: OpenArabDictWord)
    {
        const id = this.GenerateUniqueWordId(word);

        word.id = id;
        this.words[id] = word;

        this.AddToSpellingDict(word);

        return word;
    }

    public FindWord(criteria: { text: string; })
    {
        function filterWord(word: OpenArabDictWord)
        {
            return word.text === criteria.text;
        }

        const words = ObjectExtensions.Values(this.words).NotUndefined().Filter(filterWord).ToArray();
        if(words.length === 1)
            return words[0].id;
        if(words.length === 0)
        {
            console.log(criteria);
            throw new Error("Could not find word");
        }
        throw new Error("TODO");
    }

    public GetRoot(rootId: string)
    {
        return this.roots[rootId]!;
    }

    public GetWord(wordId: string)
    {
        return this.words[wordId]!;
    }

    public MapDialectKey(dialectKey: string)
    {
        return this.dialectMap[dialectKey];
    }

    public async Store(path: string)
    {
        const finalDB: OpenArabDictDocument = {
            dialects: this.dialects,
            roots: ObjectExtensions.Values(this.roots).NotUndefined().ToArray(),
            words: ObjectExtensions.Values(this.words).NotUndefined().ToArray(),
            wordRelations: this.relations
        };
        //const stringified = JSON.stringify(finalDB, undefined, 2);
        const stringified = JSON.stringify(finalDB);

        await fs.promises.writeFile(path, stringified, "utf-8");
    }

    //Private methods
    private AddToSpellingDict(word: OpenArabDictWord)
    {
        const vocalized = ParseVocalizedText(word.text);
        const buckwalter = Buckwalter.ToString(vocalized);

        const wordIds = this.wordsWithEqualSpellingDict[buckwalter];
        if(wordIds === undefined)
            this.wordsWithEqualSpellingDict[buckwalter] = [word.id];
        else
        {
            for (const wordId of wordIds)
            {
                this.relations.push({
                    relationship: OpenArabDictWordRelationshipType.EqualSpelling,
                    word1Id: word.id,
                    word2Id: wordId
                });
            }
            wordIds.push(word.id);
        }
    }

    private GenerateRootId(radicals: string)
    {
        const vocalized = ParseVocalizedText(radicals);
        return Buckwalter.ToString(vocalized);
    }

    private GenerateWordId(word: OpenArabDictWord)
    {
        function ShortType()
        {
            switch(word.type)
            {
                case OpenArabDictWordType.Adjective:
                    return "a";
                case OpenArabDictWordType.Noun:
                    return "n";
                case OpenArabDictWordType.Preposition:
                    return "p";
                case OpenArabDictWordType.Verb:
                    const stem = (word.stemParameters === undefined) ? "" : word.stemParameters;
                    return "v" + word.dialectId + stem;
            }
            return "";
        }

        const vocalized = ParseVocalizedText(word.text);

        return ShortType() + Buckwalter.ToString(vocalized);
    }

    private GenerateUniqueWordId(word: OpenArabDictWord)
    {
        const wordId = this.GenerateWordId(word);

        if(this.GetWord(wordId) === undefined)
            return wordId;

        for(let i = 2; true; i++)
        {
            const id = wordId + i;
            if(this.GetWord(id) === undefined)
                return id;
        }
    }

    //State
    private dialectMap: Dictionary<number>;
    private dialects: OpenArabDictDialect[];
    private relations: OpenArabDictWordRelation[];
    private roots: Dictionary<OpenArabDictRoot>;
    private words: Dictionary<OpenArabDictWord>;
    private wordsWithEqualSpellingDict: Dictionary<string[]>;
}
