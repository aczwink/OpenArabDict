/**
 * OpenArabDict
 * Copyright (C) 2025-2026 Amir Czwink (amir130@hotmail.de)
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
import { OpenArabDictDialect, OpenArabDictDocument, OpenArabDictLexeme, OpenArabDictPartOfSpeech, OpenArabDictPOSType, OpenArabDictRoot, OpenArabDictTranslationDocument, OpenArabDictTranslationEntry, OpenArabDictWordRelation, OpenArabDictWordRelationshipType } from "@aczwink/openarabdict-domain";
import { Dictionary, ObjectExtensions } from "@aczwink/acts-util-core";
import { Buckwalter } from "@aczwink/openarabicconjugation/dist/Transliteration";
import { ParseVocalizedPhrase, ParseVocalizedText } from "@aczwink/openarabicconjugation/dist/Vocalization";
import { DialectTree } from "@aczwink/openarabdict-openarabicconjugation-bridge";

export class DBBuilder
{
    constructor()
    {
        this.dialectMap = {};
        this.dialects = [];
        this.relations = [];
        this.roots = {};
        this.translations = new Map();
        this.userWordIdMap = {};
        this.lexemes = {};
        this.lexicalUnitMap = {};
        this.lexicalUnitToLexemeMap = {};
        this.wordsWithEqualSpellingDict = {};
    }

    //Public methods
    public AddDialect(key: string, name: string, emojiCodes: string, glottoCode: string, iso639code: string, parentId: number | null)
    {
        const id = this.dialects.length + 1;
        this.dialectMap[key] = id;
        const dialect: OpenArabDictDialect = {
            id,
            name,
            emojiCodes,
            glottoCode,
            iso639code,
            parentId
        };
        this.dialects.push(dialect);

        DialectTree.Define(dialect);

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

    public AddRoot(radicals: string, ya?: true)
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

    public AddUserWordIdMapping(userWordId: string, wordId: string)
    {
        if(userWordId in this.userWordIdMap)
            throw new Error("User word ids must be unique and '" + userWordId + "' is not.");
        this.userWordIdMap[userWordId] = wordId;
    }

    public AddWord(lexeme: OpenArabDictLexeme, translations: OpenArabDictTranslationEntry[])
    {
        const lexemeId = this.GenerateUniqueLexemeId(lexeme);

        lexeme.id = lexemeId;

        for (const sense of lexeme.senses)
        {
            for (const unit of sense.units)
            {
                const lexicalUnitId = this.DeriveLexicalUnitId(lexemeId, unit.pos);
                unit.id = lexicalUnitId;
                
                this.lexicalUnitMap[lexicalUnitId] = unit.pos;
                this.lexicalUnitToLexemeMap[lexicalUnitId] = lexeme;
                this.translations.set(lexicalUnitId, translations);
            }
        }

        this.lexemes[lexemeId] = lexeme;

        this.AddToSpellingDict(lexeme);

        return lexeme;
    }

    public FindWord(criteria: { text: string; })
    {
        function filterWord(word: OpenArabDictLexeme)
        {
            return word.text === criteria.text;
        }

        const words = ObjectExtensions.Values(this.lexemes).NotUndefined().Filter(filterWord).ToArray();
        if(words.length === 1)
            return words[0].id;
        if(words.length === 0)
        {
            console.log(criteria);
            throw new Error("Could not find word");
        }
        throw new Error("Multiple words where found");
    }

    public GetLexeme(lexemeId: string)
    {
        const lexeme = this.lexemes[lexemeId];
        if(lexeme === undefined)
            throw new Error("Programming error. Lexeme does not exist: " + lexemeId);
        return lexeme;
    }
    public GetLexemeFromLexicalUnitId(lexicalUnitId: string)
    {
        return this.lexicalUnitToLexemeMap[lexicalUnitId]!;
    }

    public GetLexicalUnit(lexicalUnitId: string)
    {
        return this.lexicalUnitMap[lexicalUnitId]!;
    }

    public GetRoot(rootId: string)
    {
        return this.roots[rootId]!;
    }

    public GetVerbLexicalUnit(lexicalUnitId: string)
    {
        const pos = this.GetLexicalUnit(lexicalUnitId);
        if(pos.type !== OpenArabDictPOSType.Verb)
            throw new Error("Id error");
        return pos;
    }

    public LookupUserWordId(userWordId: string)
    {
        const wordId = this.userWordIdMap[userWordId];
        if(wordId === undefined)
            throw new Error("User word id '" + userWordId + "' does not exist.");
        return wordId;
    }

    public MapDialectKey(dialectKey: string)
    {
        return this.dialectMap[dialectKey];
    }

    public async StoreMainDict(path: string)
    {
        const finalDB: OpenArabDictDocument = {
            dialects: this.dialects,
            lexemes: ObjectExtensions.Values(this.lexemes).NotUndefined().ToArray(),
            roots: ObjectExtensions.Values(this.roots).NotUndefined().ToArray(),
            wordRelations: this.relations
        };
        const stringified = JSON.stringify(finalDB);

        await fs.promises.writeFile(path, stringified, "utf-8");

        return finalDB;
    }

    public async StoreTranslationsDict(path: string)
    {
        const finalDB: OpenArabDictTranslationDocument = {
            entries: this.translations.Entries().Map(kv => ({
                lexicalUnitId: kv.key,
                translations: kv.value
            })).ToArray()
        };
        const stringified = JSON.stringify(finalDB);

        await fs.promises.writeFile(path, stringified, "utf-8");
    }

    //Private methods
    private AddToSpellingDict(word: OpenArabDictLexeme)
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

    private DeriveLexicalUnitId(lexemeId: string, pos: OpenArabDictPartOfSpeech)
    {
        function ShortType()
        {
            switch(pos.type)
            {
                case OpenArabDictPOSType.Adjective:
                    return "a";
                case OpenArabDictPOSType.Noun:
                    return "n";
                case OpenArabDictPOSType.Preposition:
                    return "p";
                case OpenArabDictPOSType.Verb:
                    const stem = pos.form.stem;
                    return "v" + stem;
            }
            return "";
        }
        return lexemeId + ShortType();
    }

    private GenerateRootId(radicals: string)
    {
        const vocalized = ParseVocalizedText(radicals);
        return Buckwalter.ToString(vocalized);
    }

    private GenerateLexemeId(word: OpenArabDictLexeme)
    {
        const transliterated = ParseVocalizedPhrase(word.text).map(Buckwalter.ToString);
        return transliterated.join("_");
    }

    private GenerateUniqueLexemeId(word: OpenArabDictLexeme)
    {
        const wordId = this.GenerateLexemeId(word);

        if(this.lexemes[wordId] === undefined)
            return wordId;

        for(let i = 2; true; i++)
        {
            const id = wordId + i;
            if(this.lexemes[id] === undefined)
                return id;
        }
    }

    //State
    private dialectMap: Dictionary<number>;
    private dialects: OpenArabDictDialect[];
    private relations: OpenArabDictWordRelation[];
    private roots: Dictionary<OpenArabDictRoot>;
    private translations: Map<string, OpenArabDictTranslationEntry[]>;
    private userWordIdMap: Dictionary<string>;
    private lexemes: Dictionary<OpenArabDictLexeme>;
    private lexicalUnitMap: Dictionary<OpenArabDictPartOfSpeech>;
    private lexicalUnitToLexemeMap: Dictionary<OpenArabDictLexeme>;
    private wordsWithEqualSpellingDict: Dictionary<string[]>;
}
