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

import { OpenArabDictParentType, OpenArabDictWordParent, OpenArabDictWordType } from "@aczwink/openarabdict-domain";
import { TreeTrace } from "./TreeTrace";
import { DBBuilder } from "./DBBuilder";
import { CreateVerbFromOADVerb, Mapping } from "@aczwink/openarabdict-openarabicconjugation-bridge";
import { Conjugator, DialectType, TargetVerbBasedDerivationPatterns } from "@aczwink/openarabicconjugation";
import { ParseVocalizedText } from "@aczwink/openarabicconjugation/dist/Vocalization";
import { TargetAdjectiveNounDerivation } from "@aczwink/openarabicconjugation/dist/DialectConjugator";
import { TargetNounBasedDerivationPatterns } from "@aczwink/openarabicconjugation/dist/Conjugator";

export function ExtractRoot(builder: DBBuilder, parent?: TreeTrace)
{
    let rootId;
    if(parent?.type === "root")
        rootId = parent.rootId;
    else if(parent?.type === "verb")
    {
        const parentWord = builder.GetWord(parent.verbId);
        if(parentWord.type !== OpenArabDictWordType.Verb)
            throw new Error("ID ERROR!");
        rootId = parentWord.rootId;
    }
    else
        throw new Error("Verbs must be direct children of a root or a verb");
    const root = builder.GetRoot(rootId);

    return root;
}

function GenerateAllPossibleTextsFromDerivationForVerb(parent: OpenArabDictWordParent, builder: DBBuilder)
{
    const conjugator = new Conjugator;

    const verb = builder.GetWord(parent.id);
    if(verb.type !== OpenArabDictWordType.Verb)
        throw new Error("Id error!!!");
    const root = builder.GetRoot(verb.rootId);
        
    const verbInstance = CreateVerbFromOADVerb(DialectType.ModernStandardArabic, root, verb);

    switch(parent.type)
    {
        case OpenArabDictParentType.CharacteristicNoun:
            return conjugator.DeriveFromVerb(verbInstance, TargetVerbBasedDerivationPatterns.CharacteristicNoun);
        case OpenArabDictParentType.NounOfPlace:
            //TODO: fix this
            return undefined;
            //return conjugator.DeriveFromVerb(verbInstance, TargetVerbBasedDerivationPatterns.NounOfPlace);
        case OpenArabDictParentType.ToolNoun:
            return conjugator.DeriveFromVerb(verbInstance, TargetVerbBasedDerivationPatterns.ToolNouns);
    }
}

export function GenerateAllPossibleTextsFromDerivation(parent: OpenArabDictWordParent, builder: DBBuilder)
{
    switch(parent.type)
    {
        case OpenArabDictParentType.CharacteristicNoun:
        case OpenArabDictParentType.NounOfPlace:
        case OpenArabDictParentType.ToolNoun:
            return GenerateAllPossibleTextsFromDerivationForVerb(parent, builder);
        case OpenArabDictParentType.Plural:
            {
                const parentWord = builder.GetWord(parent.id);
                const hasGender = (parentWord.type !== OpenArabDictWordType.Adjective) && (parentWord.type !== OpenArabDictWordType.Noun) && (parentWord.type !== OpenArabDictWordType.Numeral) && (parentWord.type !== OpenArabDictWordType.Pronoun);
                if(hasGender)
                    throw new Error("Singulars do have to have a gender: " + parentWord.type);

                const conjugator = new Conjugator;

                const parsed = ParseVocalizedText(parentWord.text);
                const generated = conjugator.DeriveSoundAdjectiveOrNoun(parsed, Mapping.MapGender(parentWord.gender), TargetAdjectiveNounDerivation.DerivePluralSameGender, DialectType.ModernStandardArabic);

                //TODO: fix this                
                /*return [
                    generated,
                    ...conjugator.DeriveFromNoun(parsed, TargetNounBasedDerivationPatterns.PluralPatterns)
                ];*/
            }
    }

    return undefined;
}