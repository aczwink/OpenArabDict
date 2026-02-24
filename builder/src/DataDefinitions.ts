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

import { AdvancedStemNumber } from "@aczwink/openarabicconjugation/dist/Definitions";
import { _LegacyParameterizedStem1Data } from "./_LegacyDataDefinition";

export interface UsageDefinition
{
    text: string;
    translation: string;
    type: "meaning-in-context" | "example";
}

export interface TranslationDefinition
{
    dialect: string;
    contextual?: { text: string; translation: string; }[];
    examples?: { text: string; translation: string; }[];
    complete?: true;
    source: "hw4" | "hw4-free-text";
    "source-page"?: number;
    text: string[];
    url?: string;
    usage?: UsageDefinition[];
}

export interface GenderedWordDefinition
{
    type?: "adjective" | "noun" | "numeral" | "pronoun";
    alias?: string;
    derivation: "active-participle" | "definite-state" | "feminine" | "instance-noun" | "noun-of-place" | "passive-participle" | "plural" | "singulative" | "tool-noun" | "verbal-noun";
    gender?: "male" | "female";
    text?: string;
    translations: TranslationDefinition[];
    derived?: WordDefinition[];
}

export interface OtherWordDefinition
{
    type: "adverb" | "conjunction" | "foreign-verb" | "interjection" | "particle" | "phrase" | "preposition";
    alias?: string;
    derivation: "adverbial-accusative" | "extension";
    text: string;
    translations: TranslationDefinition[];
    derived?: WordDefinition[];
}

export interface VerbVariantDefintion
{
    dialect: string;
    parameters: string;
    type?: "defective" | "irregular" | "sound";
}

interface ParameterizedStem1DataWithVariants
{
    stem: 1;
    variants: VerbVariantDefintion[];
    "stative-active-participle"?: true;
}

interface ParameterizedAdvancedStemData
{
    stem: AdvancedStemNumber;
    type?: "irregular" | "sound";
}

export type ParameterizedStemData = _LegacyParameterizedStem1Data | ParameterizedStem1DataWithVariants | ParameterizedAdvancedStemData;

export interface VerbWordDefinition
{
    type: "verb";
    alias?: string;
    form: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | ParameterizedStemData;
    translations?: TranslationDefinition[];
    derived?: WordDefinition[];
    derivation?: "colloquial";
}

export type WordDefinition = GenderedWordDefinition | OtherWordDefinition | VerbWordDefinition;