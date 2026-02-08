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
import { OpenArabDictWordType, OpenArabDictVerbDerivationType, OpenArabDictNonVerbDerivationType, OpenArabDictWordParent, OpenArabDictWordParentType, OpenArabDictWordRelationshipType, OpenArabDictTranslationEntry, UsageType } from "@aczwink/openarabdict-domain";
import { GenderedWordDefinition, OtherWordDefinition, TranslationDefinition, UsageDefinition, VerbWordDefinition, WordDefinition } from "./DataDefinitions";
import { DBBuilder } from "./DBBuilder";
import { WordDefinitionValidator, WordValidator } from "./WordDefinitionValidator";
import { TreeTrace } from "./TreeTrace";
import { ValidateType } from "./validators/ValidateType";
import { ValidateGender } from "./validators/ValidateGender";
import { ValidatePlural } from "./validators/ValidatePlural";
import { ValidateText } from "./validators/ValidateText";
import { ValidateFeminine } from "./validators/ValidateFeminine";
import { HansWehr4Formatter } from "./formatters/HansWehr4Formatter";
import { ValidateVerbForm } from "./validators/ValidateVerbForm";
import { ExtractRoot } from "./shared";
import { VerbalNounCounter } from "./VerbalNounCounter";
import { _LegacyBuildUsage, _LegacyExtractDialect } from "./_LegacyDataDefinition";

export class WordProcessor
{
}

function ProcessTranslationDefinition(x: TranslationDefinition, builder: DBBuilder): OpenArabDictTranslationEntry
{
    function MapUsageType(def: UsageDefinition)
    {
        switch(def.type)
        {
            case "example":
                return UsageType.Example;
            case "meaning-in-context":
                return UsageType.MeaningInContext;
        }
    }

    HansWehr4Formatter(x);
    
    return {
        dialectId: builder.MapDialectKey(x.dialect)!,
        complete: x.complete,
        text: x.text,
        url: x.url,
        usage: x.usage?.map(y => ({ text: y.text, translation: y.translation, type: MapUsageType(y) })) ?? _LegacyBuildUsage(x)
    };
}

export function ProcessWordDefinition(wordDef: WordDefinition, builder: DBBuilder, verbalNounCounter: VerbalNounCounter, parent: TreeTrace)
{
    const translations = wordDef.translations?.map(x => ProcessTranslationDefinition(x, builder)) ?? [];

    const wdv = new WordDefinitionValidator(wordDef, parent);
    const validators: WordValidator[] = [
        //no dependencies
        ValidateType,
        ValidateFeminine,
        ValidatePlural,
        ValidateVerbForm.bind(undefined, builder),
        ValidateText.bind(undefined, builder, verbalNounCounter, translations),
        //dependency on text and type
        ValidateGender,
    ];
    for (const validator of validators)
        validator(wdv);

    const result = wdv.ConstructResult();

    function MapVerbDerivationType(derivation: string)
    {
        switch(derivation)
        {
            case "active-participle":
                return OpenArabDictVerbDerivationType.ActiveParticiple;
            case "colloquial":
                return OpenArabDictVerbDerivationType.Colloquial;
            case "meaning-related":
                return OpenArabDictVerbDerivationType.MeaningRelated;
            case "noun-of-place":
                return OpenArabDictVerbDerivationType.NounOfPlace;
            case "passive-participle":
                return OpenArabDictVerbDerivationType.PassiveParticiple;
            case "verbal-noun":
                return OpenArabDictVerbDerivationType.VerbalNoun;
            default:
                throw new Error(derivation);
        }
    }

    function MapWordDerivationType(derivation: string)
    {
        switch(derivation)
        {
            case "adverbial-accusative":
                return OpenArabDictNonVerbDerivationType.AdverbialAccusative;
            case "colloquial":
                return OpenArabDictNonVerbDerivationType.Colloquial;
            case "elative-degree":
                return OpenArabDictNonVerbDerivationType.ElativeDegree;
            case "extension":
                return OpenArabDictNonVerbDerivationType.Extension;
            case "feminine":
                return OpenArabDictNonVerbDerivationType.Feminine;
            case "instance-noun":
                return OpenArabDictNonVerbDerivationType.InstanceNoun;
            case "nisba":
                return OpenArabDictNonVerbDerivationType.Nisba;
            case "plural":
                return OpenArabDictNonVerbDerivationType.Plural;
            case "singulative":
                return OpenArabDictNonVerbDerivationType.Singulative;
            default:
                throw new Error(derivation);
        }
    }

    function MapParent(derivation: string, parent?: TreeTrace): OpenArabDictWordParent | undefined
    {
        switch(parent?.type)
        {
            case "root":
                return {
                    type: OpenArabDictWordParentType.Root,
                    rootId: parent.rootId
                };
            case "verb":
                return {
                    type: OpenArabDictWordParentType.Verb,
                    verbId: parent.verbId,
                    derivation: MapVerbDerivationType(derivation)
                };
            case "word":
                return {
                    type: OpenArabDictWordParentType.NonVerbWord,
                    wordId: parent.word.id,
                    relationType: MapWordDerivationType(derivation)
                }
        }
    }

    let thisParent: TreeTrace;
    let createdWord;
    switch(result.type)
    {
        case OpenArabDictWordType.Adjective:
        case OpenArabDictWordType.Noun:
        case OpenArabDictWordType.Numeral:
        case OpenArabDictWordType.Pronoun:
        {
            const g = wordDef as GenderedWordDefinition;
            
            const text = result.text ?? g.text;
            if(text === undefined)
            {
                console.log(g);
                throw new Error("Missing text for word!");
            }

            const word = builder.AddWord({
                id: "",
                type: result.type,
                isMale: result.isMale!,
                text,
                parent: MapParent(g.derivation, parent)
            }, translations);

            if(g.alias !== undefined)
            {
                const aliasWordId = ProcessWordDefinition({
                    type: g.type,
                    derivation: g.derivation,
                    gender: g.gender,
                    translations: g.translations,
                    derived: g.derived,
                    text: g.alias
                }, builder, verbalNounCounter, parent);

                builder.AddRelation(word.id, aliasWordId.id, OpenArabDictWordRelationshipType.Synonym);
            }

            thisParent = {
                type: "word",
                word,
                parent
            };
            createdWord = word;
        }
        break;
        case OpenArabDictWordType.Adverb:
        case OpenArabDictWordType.Conjunction:
        case OpenArabDictWordType.ForeignVerb:
        case OpenArabDictWordType.Interjection:
        case OpenArabDictWordType.Particle:
        case OpenArabDictWordType.Phrase:
        case OpenArabDictWordType.Preposition:
        {
            const o = wordDef as OtherWordDefinition;
            const word = builder.AddWord({
                id: "",
                type: result.type,
                text: o.text,
                parent: MapParent(o.derivation, parent)
            }, translations);

            if(o.alias !== undefined)
            {
                const aliasWordId = ProcessWordDefinition({
                    type: o.type,
                    derivation: o.derivation,
                    text: o.alias,
                    translations: o.translations,
                }, builder, verbalNounCounter, parent);

                builder.AddRelation(word.id, aliasWordId.id, OpenArabDictWordRelationshipType.Synonym);
            }

            thisParent = {
                type: "word",
                word,
                parent
            };
            createdWord = word;
        }
        break;
        case OpenArabDictWordType.Verb:
        {
            const v = wordDef as VerbWordDefinition;
            const form = wdv.verbForm;
            const root = ExtractRoot(builder, parent);

            const generatedVerb = builder.AddWord({
                id: "",
                type: OpenArabDictWordType.Verb,
                form,
                rootId: root.id,
                text: wdv.text,
                parent: MapParent(v.derivation!, parent) ?? ({ type: OpenArabDictWordParentType.Root, rootId: root.id})
            }, translations);

            if(v.alias !== undefined)
            {
                const aliasWordId = ProcessWordDefinition({
                    type: v.type,
                    form: {
                        stem: 1,
                        variants: [
                            { dialect: _LegacyExtractDialect(v), parameters: v.alias }
                        ],
                    },
                    translations: v.translations
                }, builder, verbalNounCounter, parent);

                builder.AddRelation(generatedVerb.id, aliasWordId.id, OpenArabDictWordRelationshipType.Synonym);
            }

            thisParent = {
                type: "verb",
                verbId: generatedVerb.id,
                parent: parent
            };
            createdWord = generatedVerb;
        }
        break;
        default:
            throw new Error("Unknown word type");
    }

    if(wordDef.derived !== undefined)
    {
        for (const child of wordDef.derived)
        {
            ProcessWordDefinition(child, builder, verbalNounCounter, thisParent);
        }
    }

    return createdWord!;
}