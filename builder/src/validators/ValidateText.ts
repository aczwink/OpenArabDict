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
import { OpenArabDictRoot, OpenArabDictTranslationEntry, OpenArabDictVerb, OpenArabDictWordType } from "openarabdict-domain";
import { Conjugator } from "openarabicconjugation/dist/Conjugator";
import { Gender, Numerus, Person, Tense, Voice } from "openarabicconjugation/dist/Definitions";
import { DialectType } from "openarabicconjugation/dist/Dialects";
import { ParseVocalizedText, VocalizedWordTostring } from "openarabicconjugation/dist/Vocalization";
import { GenderedWordDefinition } from "../DataDefinitions";
import { DBBuilder } from "../DBBuilder";
import { TreeTrace } from "../TreeTrace";
import { WordDefinitionValidator } from "../WordDefinitionValidator";
import { EqualsAny } from "acts-util-core";
import { Buckwalter } from "openarabicconjugation/dist/Transliteration";
import { ExtractRoot } from "../shared";
import { VerbalNounCounter } from "../VerbalNounCounter";
import { CreateVerbFromOADVerb, CreateVerbFromOADVerbForm, FindHighestConjugatableDialectOf } from "openarabdict-openarabicconjugation-bridge";

function CreateMSAVerb(root: OpenArabDictRoot, verb: OpenArabDictVerb)
{
    return CreateVerbFromOADVerb(DialectType.ModernStandardArabic, root, verb);
}

function GenerateTextIfPossible(validator: WordDefinitionValidator, builder: DBBuilder, translations: OpenArabDictTranslationEntry[], parent?: TreeTrace): string | undefined
{
    const wordDef = validator.wordDefinition;

    switch(wordDef.derivation)
    {
        case "active-participle":
        case "passive-participle":
        {
            if(parent?.type !== "verb")
                throw new Error("Participles can only be children of verbs");
            const verb = builder.GetWord(parent.verbId);
            if(verb.type !== OpenArabDictWordType.Verb)
                throw new Error("Id error!!!");
            const root = builder.GetRoot(verb.rootId);

            const verbInstance = CreateMSAVerb(root, verb);

            const voice = (wordDef.derivation === "active-participle") ? Voice.Active : Voice.Passive;

            const conjugator = new Conjugator;

            const generated = ((voice === Voice.Active) && (verb.form.stativeActiveParticiple === true)) ? conjugator.DeclineStativeActiveParticiple(verbInstance) : conjugator.ConjugateParticiple(verbInstance, voice);
            return VocalizedWordTostring(generated);
        }
        case "verbal-noun":
        {
            if(parent?.type !== "verb")
                throw new Error("Verbal nouns can only be children of verbs");
            const verb = builder.GetWord(parent.verbId);
            if(verb.type !== OpenArabDictWordType.Verb)
                throw new Error("Id error!!!");
            const root = builder.GetRoot(verb.rootId);

            const verbInstance = CreateMSAVerb(root, verb);

            const conjugator = new Conjugator;
            if(conjugator.HasPotentiallyMultipleVerbalNounForms(verbInstance))
                return undefined;

            const generated = conjugator.GenerateAllPossibleVerbalNouns(verbInstance);
            return VocalizedWordTostring(generated[0]);
        }
        case "colloquial":
        case undefined:
        {
            if(wordDef.type === "verb")
            {
                const root = ExtractRoot(builder, parent);

                const form = validator.verbForm;

                const dialectType = FindHighestConjugatableDialectOf(form, translations);
                const verb = CreateVerbFromOADVerbForm(dialectType, root.radicals, form);

                const conjugator = new Conjugator;
                const vocalized = conjugator.Conjugate(verb, {
                    gender: Gender.Male,
                    numerus: Numerus.Singular,
                    person: Person.Third,
                    tense: Tense.Perfect,
                    voice: Voice.Active,
                });
    
                const conjugatedWord = VocalizedWordTostring(vocalized);

                return conjugatedWord;
            }
        }
    }

    return undefined;
}

function ValidateVerbalNoun(word: GenderedWordDefinition, builder: DBBuilder, verbalNounCounter: VerbalNounCounter, parent: TreeTrace | undefined)
{
    if(parent?.type !== "verb")
        throw new Error("Verbal nouns can only be children of verbs");
    const verb = builder.GetWord(parent.verbId);
    if(verb.type !== OpenArabDictWordType.Verb)
        throw new Error("Id error!!!");
    const root = builder.GetRoot(verb.rootId);

    const verbInstance = CreateMSAVerb(root, verb);

    const conjugator = new Conjugator;
    const generated = conjugator.GenerateAllPossibleVerbalNouns(verbInstance);

    const parsed = ParseVocalizedText(word.text ?? "");
    for (let i = 0; i < generated.length; i++)
    {
        const possible = generated[i];
        if(EqualsAny(possible, parsed))
        {
            verbalNounCounter.Increment(verbInstance, i, generated.length);
            return;
        }
    }
    const choices = generated.map(VocalizedWordTostring).join(", ");
    throw new Error("Illegal verbal noun text definition for word. Got: " + word.text + ", " + Buckwalter.ToString(ParseVocalizedText(word.text!)) + ". But allowed values are: " + choices);
}

export function ValidateText(builder: DBBuilder, verbalNounCounter: VerbalNounCounter, translations: OpenArabDictTranslationEntry[], validator: WordDefinitionValidator)
{
    if(("text" in validator.wordDefinition) && (validator.wordDefinition.text !== undefined))
        validator.text = validator.wordDefinition.text;

    const generated = GenerateTextIfPossible(validator, builder, translations, validator.parent);
    if(generated !== undefined)
        validator.Infer("text", [generated], generated);
    else if(validator.wordDefinition.derivation === "verbal-noun")
        ValidateVerbalNoun(validator.wordDefinition, builder, verbalNounCounter, validator.parent);
}