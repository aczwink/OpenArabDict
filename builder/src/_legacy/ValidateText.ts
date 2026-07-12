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
import { OpenArabDictGender, OpenArabDictGendered, OpenArabDictParentType, OpenArabDictPOSType, OpenArabDictRoot, OpenArabDictVerb } from "@aczwink/openarabdict-domain";
import { Conjugator } from "@aczwink/openarabicconjugation/dist/Conjugator";
import { Gender, Numerus, Person, Tense, Voice } from "@aczwink/openarabicconjugation/dist/Definitions";
import { DialectType } from "@aczwink/openarabicconjugation/dist/Dialects";
import { DisplayVocalized, ParseVocalizedText, VocalizedWordTostring } from "@aczwink/openarabicconjugation/dist/Vocalization";
import { GenderedWordDefinition, MultiSenseWordDefinition } from "../DataDefinitions";
import { DBBuilder } from "../DBBuilder";
import { TreeTrace, TreeTraceNodeType } from "../TreeTrace";
import { Buckwalter } from "@aczwink/openarabicconjugation/dist/Transliteration";
import { ExtractRoot } from "../shared";
import { VerbalNounCounter } from "../VerbalNounCounter";
import { CreateVerbFromOADVerb, CreateVerbFromOADVerbForm, FindHighestConjugatableDialectOf } from "@aczwink/openarabdict-openarabicconjugation-bridge";
import { TargetAdjectiveNounDerivation } from "@aczwink/openarabicconjugation/dist/DialectConjugator";
import { ArabicText, TargetVerbBasedDerivationPatterns } from "@aczwink/openarabicconjugation";
import { WordDefinitionValidator } from "../validation/WordDefinitionValidator";
import { SenseDefinitionValidator } from "../validation/SenseDefinitionValidator";

function CreateMSAVerb(root: OpenArabDictRoot, verb: OpenArabDictVerb)
{
    return CreateVerbFromOADVerb(DialectType.ModernStandardArabic, root, verb);
}

function GenerateTextIfPossible(senseValidator: SenseDefinitionValidator, validator: WordDefinitionValidator, builder: DBBuilder, parent?: TreeTrace): DisplayVocalized[] | undefined
{
    const wordDef = validator._legacyWordDefinition;

    switch(wordDef.derivation)
    {
        case "active-participle":
        case "passive-participle":
        {
            if(parent?.type !== TreeTraceNodeType.LexicalUnit)
                throw new Error("Participles can only be children of verbs");
            const verbData = builder.GetVerbLexicalUnit(parent.lexicalUnitId);
            const root = builder.GetRoot(verbData.rootId);

            const verbInstance = CreateMSAVerb(root, verbData);

            const voice = (wordDef.derivation === "active-participle") ? TargetVerbBasedDerivationPatterns.ActiveParticiples : TargetVerbBasedDerivationPatterns.PassiveParticiple;

            const conjugator = new Conjugator;
            const generated = ((voice === TargetVerbBasedDerivationPatterns.ActiveParticiples) && (verbData.form.stative === true)) ? conjugator.DeriveFromVerb(verbInstance, TargetVerbBasedDerivationPatterns.ActiveParticiples)[1] : conjugator.DeriveFromVerb(verbInstance, voice)[0];
            return generated;
        }
        case "instance-noun":
        {
            if(parent?.type !== TreeTraceNodeType.LexicalUnit)
                throw new Error("Instance nouns can only be derived from verbal nouns");
            const parentIsVerbalNoun = (parent.parent.lexeme.parent.length === 1) && (parent.parent.lexeme.parent[0].type === OpenArabDictParentType.VerbalNoun);
            if(!parentIsVerbalNoun)
                throw new Error("Instance nouns can only be derived from verbal nouns");
            const verbalNoun = parent.parent.lexeme.senses[0].units[0].pos as OpenArabDictGendered;
            
            const c = new Conjugator();
            const baseParsed = ArabicText.ReconstructFullyVocalizedWord(parent.parent.lexeme.text);
            const generated = c.DeriveSoundAdjectiveOrNoun(baseParsed, (verbalNoun.gender === OpenArabDictGender.Male) ? Gender.Male : Gender.Female, TargetAdjectiveNounDerivation.DeriveFeminineSingular, DialectType.ModernStandardArabic);

            return generated;
        }
        case "singulative":
        {
            if((parent?.type !== TreeTraceNodeType.LexicalUnit) || (parent.parent.lexeme.senses[0].units[0].pos.type !== OpenArabDictPOSType.Noun))
                throw new Error("Singulatives can only be derived from nouns");

            const c = new Conjugator();
            const baseParsed = ArabicText.ReconstructFullyVocalizedWord(parent.parent.lexeme.text);
            const generated = c.DeriveSoundAdjectiveOrNoun(baseParsed, (parent.parent.lexeme.senses[0].units[0].pos.gender === OpenArabDictGender.Male) ? Gender.Male : Gender.Female, TargetAdjectiveNounDerivation.DeriveFeminineSingular, DialectType.ModernStandardArabic);

            return generated;
        }
        case "verbal-noun":
        {
            if(parent?.type !== TreeTraceNodeType.LexicalUnit)
                throw new Error("Verbal nouns can only be children of verbs");

            const verbData = builder.GetVerbLexicalUnit(parent.lexicalUnitId);
            const root = builder.GetRoot(verbData.rootId);

            const verbInstance = CreateMSAVerb(root, verbData);

            const conjugator = new Conjugator;
            const generated = conjugator.DeriveFromVerb(verbInstance, TargetVerbBasedDerivationPatterns.VerbalNouns);
            if(generated.length === 1)
                return generated[0];
            break;
        }
        case "colloquial":
        case undefined:
        {
            if(wordDef.type === "verb")
            {
                const root = ExtractRoot(builder, parent);

                const form = senseValidator.verbForm;

                const dialectType = FindHighestConjugatableDialectOf(root.radicals, form, senseValidator.translations);
                const verb = CreateVerbFromOADVerbForm(dialectType, root.radicals, form);

                const conjugator = new Conjugator;
                const vocalized = conjugator.Conjugate(verb, {
                    gender: Gender.Male,
                    numerus: Numerus.Singular,
                    person: Person.Third,
                    tense: Tense.Perfect,
                    voice: Voice.Active,
                });

                return vocalized;
            }
        }
    }

    return undefined;
}

function ValidateVerbalNoun(parsed: DisplayVocalized[], word: GenderedWordDefinition | MultiSenseWordDefinition, builder: DBBuilder, verbalNounCounter: VerbalNounCounter, parent: TreeTrace | undefined)
{
    if(parent?.type !== TreeTraceNodeType.LexicalUnit)
        throw new Error("Verbal nouns can only be children of verbs");
    const verbData = builder.GetVerbLexicalUnit(parent.lexicalUnitId);
    const root = builder.GetRoot(verbData.rootId);

    const verbInstance = CreateMSAVerb(root, verbData);

    const conjugator = new Conjugator;
    const generated = conjugator.DeriveFromVerb(verbInstance, TargetVerbBasedDerivationPatterns.VerbalNouns);

    for (let i = 0; i < generated.length; i++)
    {
        const possible = generated[i];
        if(ArabicText.EqualsVocalized(possible, parsed))
        {
            verbalNounCounter.Increment(verbInstance, i, generated.length);
            return;
        }
    }
    const choices = generated.map(VocalizedWordTostring).join(", ");
    throw new Error("Illegal verbal noun text definition for word. Got: " + word.text + ", " + Buckwalter.ToString(ParseVocalizedText(word.text ?? "")) + ". But allowed values are: " + choices);
}

function ValidateTextForSense(senseValidator: SenseDefinitionValidator, builder: DBBuilder, verbalNounCounter: VerbalNounCounter, validator: WordDefinitionValidator)
{
    const generated = GenerateTextIfPossible(senseValidator, validator, builder, validator.sourceTreeTrace);
    if(generated !== undefined)
    {
        const generatedString = VocalizedWordTostring(generated);
        validator.InferValue("text", generatedString);
    }
    else
    {
        const text = ("text" in validator._legacyWordDefinition) ? (validator._legacyWordDefinition.text ?? "") : "";
        const parsed = ParseVocalizedText(text);
        switch(validator._legacyWordDefinition.derivation)
        {
            case "verbal-noun":
                ValidateVerbalNoun(parsed, validator._legacyWordDefinition, builder, verbalNounCounter, validator.sourceTreeTrace);
                break;
        }
    }
}

export function _LegacyValidateText(builder: DBBuilder, verbalNounCounter: VerbalNounCounter, validator: WordDefinitionValidator)
{
    for (const sense of validator.senses)
    {
        ValidateTextForSense(sense, builder, verbalNounCounter, validator);
    }
}