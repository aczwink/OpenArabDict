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

import { OpenArabDictGender, OpenArabDictLexeme, OpenArabDictParent, OpenArabDictParentType, OpenArabDictPOSType } from "@aczwink/openarabdict-domain";
import { TreeTrace, TreeTraceNodeType } from "./TreeTrace";
import { DBBuilder } from "./DBBuilder";
import { CreateVerbFromOADVerb, DialectTree, Mapping } from "@aczwink/openarabdict-openarabicconjugation-bridge";
import { ArabicText, Conjugator, DialectType, Gender, TargetVerbBasedDerivationPatterns } from "@aczwink/openarabicconjugation";
import { TargetAdjectiveNounDerivation } from "@aczwink/openarabicconjugation/dist/DialectConjugator";
import { TargetNounBasedDerivationPatterns } from "@aczwink/openarabicconjugation/dist/Conjugator";
import { VocalizedWordTostring } from "@aczwink/openarabicconjugation/dist/Vocalization";


export function ExtractRoot(builder: DBBuilder, parent?: TreeTrace)
{
    let rootId;
    if(parent?.type === "root")
        rootId = parent.rootId;
    else if(parent?.type === TreeTraceNodeType.LexicalUnit)
    {
        const parentWord = builder.GetVerbLexicalUnit(parent.lexicalUnitId);
        rootId = parentWord.rootId;
    }
    else
        throw new Error("Verbs must be direct children of a root or a verb");
    const root = builder.GetRoot(rootId);

    return root;
}

function GenerateAllPossibleTextsFromDerivationForVerb(parent: OpenArabDictParent, builder: DBBuilder)
{
    const conjugator = new Conjugator;

    const verbData = builder.GetVerbLexicalUnit(parent.id);
    const root = builder.GetRoot(verbData.rootId);
        
    const verbInstance = CreateVerbFromOADVerb(DialectType.ModernStandardArabic, root, verbData);

    switch(parent.type)
    {
        case OpenArabDictParentType.CharacteristicNoun:
            return conjugator.DeriveFromVerb(verbInstance, TargetVerbBasedDerivationPatterns.CharacteristicNoun);
        case OpenArabDictParentType.NounOfPlace:
            return conjugator.DeriveFromVerb(verbInstance, TargetVerbBasedDerivationPatterns.NounOfPlace);
        case OpenArabDictParentType.ToolNoun:
            return conjugator.DeriveFromVerb(verbInstance, TargetVerbBasedDerivationPatterns.ToolNouns);
    }
}

function SupportsModernStandardArabic(lexeme: OpenArabDictLexeme, builder: DBBuilder): boolean
{
    for (const sense of lexeme.senses)
    {
        if(sense.units.length !== 1)
            throw new Error("Function not implemented. 2: " + lexeme.text);
        const unitId = sense.units[0].id;
        const translations = builder.GetTranslations(unitId);
        for (const entry of translations!)
        {
            const type = DialectTree.MapIdToType(entry.dialectId)
            if(type === DialectType.ModernStandardArabic)
                return true;
        }
    }
    return false;
}

export function GenerateAllPossibleTextsFromDerivation(parent: OpenArabDictParent, builder: DBBuilder)
{
    switch(parent.type)
    {
        case OpenArabDictParentType.CharacteristicNoun:
        case OpenArabDictParentType.NounOfPlace:
        case OpenArabDictParentType.ToolNoun:
            return GenerateAllPossibleTextsFromDerivationForVerb(parent, builder);
        case OpenArabDictParentType.Plural:
            {
                const parentUnitPOS = builder.GetLexicalUnit(parent.id);
                const hasGender = (parentUnitPOS.type !== OpenArabDictPOSType.Adjective) && (parentUnitPOS.type !== OpenArabDictPOSType.Noun) && (parentUnitPOS.type !== OpenArabDictPOSType.Numeral) && (parentUnitPOS.type !== OpenArabDictPOSType.Pronoun);
                if(hasGender)
                    throw new Error("Singulars do have to have a gender: " + parentUnitPOS.type);
                const parentLexeme = builder.GetLexemeFromLexicalUnitId(parent.id);
                if(!SupportsModernStandardArabic(parentLexeme, builder))
                    break;

                const conjugator = new Conjugator;

                const reconstructed = ArabicText.ReconstructFullyVocalizedWord(parentLexeme.text);
                const generated = conjugator.DeriveSoundAdjectiveOrNoun(reconstructed, Mapping.MapGender(parentUnitPOS.gender), TargetAdjectiveNounDerivation.DerivePluralSameGender, DialectType.ModernStandardArabic);

                const soundPlurals = [generated];

                if(parentUnitPOS.gender === OpenArabDictGender.Male)
                {
                    const withTaMarbuta = conjugator.DeriveSoundAdjectiveOrNoun(reconstructed, Gender.Male, TargetAdjectiveNounDerivation.DeriveFeminineSingular, DialectType.ModernStandardArabic);
                    const reconstructed2 = ArabicText.ReconstructFullyVocalizedWord(VocalizedWordTostring(withTaMarbuta));

                    //many male nouns also often have the "-at" plural
                    const generated = conjugator.DeriveSoundAdjectiveOrNoun(reconstructed2, Gender.Female, TargetAdjectiveNounDerivation.DerivePluralSameGender, DialectType.ModernStandardArabic);
                    soundPlurals.push(generated);
                }

                return [
                    ...soundPlurals,
                    ...conjugator.DeriveFromNoun(reconstructed, TargetNounBasedDerivationPatterns.PluralPatterns)
                ];
            }
    }

    return undefined;
}