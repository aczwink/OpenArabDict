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
import { OpenArabDictWordType } from "openarabdict-domain";
import { Conjugator } from "openarabicconjugation/dist/Conjugator";
import { Voice } from "openarabicconjugation/dist/Definitions";
import { DialectType } from "openarabicconjugation/dist/Dialects";
import { CreateVerb } from "openarabicconjugation/dist/Verb";
import { VerbRoot } from "openarabicconjugation/dist/VerbRoot";
import { ParseVocalizedText, VocalizedWordTostring } from "openarabicconjugation/dist/Vocalization";
import { GenderedWordDefinition, WordDefinition } from "../DataDefinitions";
import { DBBuilder } from "../DBBuilder";
import { TreeTrace } from "../TreeTrace";
import { WordDefinitionValidator } from "../WordDefinitionValidator";
import { EqualsAny } from "acts-util-core";
import { Buckwalter } from "openarabicconjugation/dist/Transliteration";
import { MapVerbTypeToOpenArabicConjugation } from "../shared";

function GenerateTextIfPossible(word: WordDefinition, builder: DBBuilder, parent?: TreeTrace): string | undefined
{
    switch(word.derivation)
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

            const rootInstance = new VerbRoot(root.radicals);
            const verbType = MapVerbTypeToOpenArabicConjugation(verb.verbType) ?? rootInstance.DeriveDeducedVerbType();
            const verbInstance = CreateVerb(DialectType.ModernStandardArabic, rootInstance, verb.stemParameters ?? verb.stem as any, verbType);

            const voice = (word.derivation === "active-participle") ? Voice.Active : Voice.Passive;

            const conjugator = new Conjugator;
            const generated = conjugator.ConjugateParticiple(verbInstance, voice);
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

            const rootInstance = new VerbRoot(root.radicals);
            const verbInstance = CreateVerb(DialectType.ModernStandardArabic, rootInstance, verb.stemParameters ?? verb.stem as any);
            const stem = (verbInstance.stem === 1) ? verbInstance : verbInstance.stem;

            const conjugator = new Conjugator;
            if(conjugator.HasPotentiallyMultipleVerbalNounForms(rootInstance, stem))
                return undefined;

            const generated = conjugator.GenerateAllPossibleVerbalNouns(rootInstance, stem);
            return VocalizedWordTostring(generated[0]);
        }
    }

    return undefined;
}

function ValidateVerbalNoun(word: GenderedWordDefinition, builder: DBBuilder, parent: TreeTrace | undefined)
{
    if(parent?.type !== "verb")
        throw new Error("Verbal nouns can only be children of verbs");
    const verb = builder.GetWord(parent.verbId);
    if(verb.type !== OpenArabDictWordType.Verb)
        throw new Error("Id error!!!");
    const root = builder.GetRoot(verb.rootId);

    const rootInstance = new VerbRoot(root.radicals);
    const verbInstance = CreateVerb(DialectType.ModernStandardArabic, rootInstance, verb.stemParameters ?? verb.stem as any);
    const stem = (verbInstance.stem === 1) ? verbInstance : verbInstance.stem;

    const conjugator = new Conjugator;
    const generated = conjugator.GenerateAllPossibleVerbalNouns(rootInstance, stem);

    const parsed = ParseVocalizedText(word.text ?? "");
    for (const possible of generated)
    {
        if(EqualsAny(possible, parsed))
            return;
    }
    throw new Error("Illegal verbal noun text definition for word. Got: " + word.text + ", " + Buckwalter.ToString(ParseVocalizedText(word.text!)));
}

export function ValidateText(builder: DBBuilder, validator: WordDefinitionValidator)
{
    if(("text" in validator.wordDefinition) && (validator.wordDefinition.text !== undefined))
        validator.text = validator.wordDefinition.text;

    const generated = GenerateTextIfPossible(validator.wordDefinition, builder, validator.parent);
    if(generated !== undefined)
        validator.Infer("text", [generated], generated);
    else if(validator.wordDefinition.derivation === "verbal-noun")
        ValidateVerbalNoun(validator.wordDefinition, builder, validator.parent);
}