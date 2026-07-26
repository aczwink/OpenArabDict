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

import { OpenArabDictRoot, OpenArabDictTranslationEntry, OpenArabDictVerb, OpenArabDictVerbForm, OpenArabDictVerbType } from "@aczwink/openarabdict-domain";
import { AdvancedStemNumber, VerbType } from "@aczwink/openarabicconjugation/dist/Definitions";
import { DialectType } from "@aczwink/openarabicconjugation/dist/Dialects";
import { CreateVerb } from "@aczwink/openarabicconjugation/dist/Verb";
import { VerbRoot } from "@aczwink/openarabicconjugation/dist/VerbRoot";
import { DialectTree } from "./DialectTree";
import { GetDialectMetadata } from "@aczwink/openarabicconjugation/dist/DialectsMetadata";
import { WordLogic } from "./WordLogic";
import { Mapping } from "./Mapping";

function ExtractVariant(dialectId: number, verbForm: OpenArabDictVerbForm)
{
    if(verbForm.variants !== undefined)
    {
        const variant = verbForm.variants.find(x => x.dialectId === dialectId);
        if(variant !== undefined)
        {
            return {
                stem: variant.stemParameters ?? verbForm.stem,
                verbType: variant.verbType ?? verbForm.verbType
            };
        }
    }
    
    return {
        stem: verbForm.stem,
        verbType: verbForm.verbType
    };
}

export function CreateVerbFromOADVerbForm(dialectType: DialectType, rootRadicals: string, verbForm: OpenArabDictVerbForm)
{
    const rootInstance = new VerbRoot(rootRadicals);
    const dialectId = DialectTree.MapTypeToId(dialectType);

    const variant = ExtractVariant(dialectId, verbForm);

    return CreateVerb(dialectType, rootInstance, variant.stem as AdvancedStemNumber | string, MapVerbTypeToOpenArabicConjugation(variant.verbType));
}

export function CreateVerbFromOADVerb(dialectType: DialectType, root: OpenArabDictRoot, verb: OpenArabDictVerb)
{
    return CreateVerbFromOADVerbForm(dialectType, root.radicals, verb.form);
}

export function FindHighestConjugatableDialectOf(rootRadicals: string, verbForm: OpenArabDictVerbForm, translations: OpenArabDictTranslationEntry[])
{
    const dialectIds = (verbForm.variants === undefined) ? translations.map(x => x.dialectId) : verbForm.variants.map(x => x.dialectId);
    const dialectTypes = dialectIds.map(x => DialectTree.MapIdToType(x)).filter(x => x !== undefined).filter(x => GetDialectMetadata(x).IsConjugatable(CreateVerbFromOADVerbForm(x, rootRadicals, verbForm)));
    if(dialectTypes.length === 0)
        return DialectType.ModernStandardArabic;
    return DialectTree.HighestOf(dialectTypes);
}

export function MapVerbTypeToOpenArabicConjugation(verbType?: OpenArabDictVerbType): VerbType | undefined
{
    switch(verbType)
    {
        case OpenArabDictVerbType.Defective:
            return VerbType.Defective;
        case OpenArabDictVerbType.Irregular:
            return VerbType.Irregular;
        case OpenArabDictVerbType.Sound:
            return VerbType.Sound;
    }
    return undefined;
}

export { DialectTree, Mapping, WordLogic };