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

import { OpenArabDictDialect } from "./dialect";
import { OpenArabDictLexeme } from "./lexeme";
import { OpenArabDictParent, OpenArabDictParentType } from "./parent";
import { OpenArabDictGender, OpenArabDictGendered, OpenArabDictPartOfSpeech, OpenArabDictPOSType, OpenArabDictVerb, OpenArabDictVerbForm, OpenArabDictVerbType } from "./part-of-speech";
import { OpenArabDictLexicalUnit, OpenArabDictSense } from "./sense";
import { OpenArabDictTranslationEntry, OpenArabDictTranslationUsageType } from "./translations";

export interface OpenArabDictRoot
{
    id: string;
    radicals: string;
    //When for a defective or hollow root ending in waw, also an equivalent root with ya exists.
    ya?: true;
}

export enum OpenArabDictWordRelationshipType
{
    Synonym = 0,
    Antonym = 1,
    EqualSpelling = 2,
}

export interface OpenArabDictWordRelation
{
    word1Id: string;
    word2Id: string;
    relationship: OpenArabDictWordRelationshipType;
}

export interface OpenArabDictDocument
{
    dialects: OpenArabDictDialect[];
    lexemes: OpenArabDictLexeme[];
    roots: OpenArabDictRoot[];
    wordRelations: OpenArabDictWordRelation[];
}

interface OpenArabDictMainTranslationEntry
{
    lexicalUnitId: string;
    translations: OpenArabDictTranslationEntry[];
}

export interface OpenArabDictTranslationDocument
{
    entries: OpenArabDictMainTranslationEntry[];
}

export {
    OpenArabDictDialect,
    OpenArabDictGender,
    OpenArabDictGendered,
    OpenArabDictLexeme,
    OpenArabDictLexicalUnit,
    OpenArabDictParentType,
    OpenArabDictParent,
    OpenArabDictPartOfSpeech,
    OpenArabDictPOSType,
    OpenArabDictSense,
    OpenArabDictTranslationEntry,
    OpenArabDictTranslationUsageType,
    OpenArabDictVerb,
    OpenArabDictVerbForm,
    OpenArabDictVerbType,
};