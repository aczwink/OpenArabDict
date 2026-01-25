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

import { OpenArabDictVerbType } from "openarabdict-domain";
import { ParameterizedStemData, VerbVariantDefintion, VerbWordDefinition } from "../DataDefinitions";
import { WordDefinitionValidator } from "../WordDefinitionValidator";
import { DBBuilder } from "../DBBuilder";
import { GetDialectMetadata } from "openarabicconjugation/dist/DialectsMetadata";
import { ExtractRoot } from "../shared";
import { VerbRoot } from "openarabicconjugation/dist/VerbRoot";
import { _LegacyExtractDialect } from "../_LegacyDataDefinition";
import { DialectTree, MapVerbTypeToOpenArabicConjugation } from "openarabdict-openarabicconjugation-bridge";
import { GlobalInjector } from "acts-util-node";
import { StatisticsCounterService, StatisticsCounter } from "../services/StatisticsCounterService";

function MapVerbType(verb: VerbWordDefinition)
{
    if(typeof verb.form === "number")
        return undefined;
    if(("type" in verb.form))
    {
        switch(verb.form.type)
        {
            case "irregular":
                return OpenArabDictVerbType.Irregular;
            case "sound":
                return OpenArabDictVerbType.Sound;
        }
    }
    return undefined;
}

function MapVerbTypeFromVariant(variant: VerbVariantDefintion)
{
    if(variant.type === undefined)
        return undefined;
    switch(variant.type)
    {
        case "defective":
            return OpenArabDictVerbType.Defective;
        case "irregular":
            return OpenArabDictVerbType.Irregular;
        case "sound":
            return OpenArabDictVerbType.Sound;
    }
    return undefined;
}

function ValidateVerbFormVariant(builder: DBBuilder, validator: WordDefinitionValidator, variant: VerbVariantDefintion)
{
    const dialectId = builder.MapDialectKey(variant.dialect)!;

    const root = ExtractRoot(builder, validator.parent);
    const rootInstance = new VerbRoot(root!.radicals);
    
    const dialectType = DialectTree.MapIdToType(dialectId)!;
    const oadVerbType = MapVerbTypeFromVariant(variant);
    const verbType = MapVerbTypeToOpenArabicConjugation(oadVerbType);

    const meta = GetDialectMetadata(dialectType);
    const defVerbType = verbType ?? meta.DeriveVerbType(rootInstance, variant.parameters);
    const choices = meta.GetStem1ContextChoices(defVerbType, rootInstance);
    if(!choices.types.includes(variant.parameters))
    {
        console.log(validator.wordDefinition, validator.wordDefinition.translations, root.radicals, variant);
        throw new Error("Wrong stem parameterization");
    }


    return {
        dialectId,
        stemParameters: variant.parameters,
        verbType: oadVerbType
    };
}

export function ValidateVerbForm(builder: DBBuilder, validator: WordDefinitionValidator)
{
    const def = validator.wordDefinition;

    if(def.type !== "verb")
        return;

    const verbType = MapVerbType(def);
    if((typeof def.form !== "number") && ("variants" in def.form) && (def.form.variants !== undefined))
    {
        const stem = def.form.stem;

        validator.verbForm = {
            stativeActiveParticiple: ExtractActiveParticipleFlag(def.form),
            stem,
            variants: def.form.variants.map(ValidateVerbFormVariant.bind(undefined, builder, validator)),
            verbType
        };
    }
    else
    {
        const stemNumber = (typeof def.form === "number") ? def.form : def.form.stem;

        const variants = ((typeof def.form !== "number") && ("parameters" in def.form)) ? [
            ValidateVerbFormVariant(builder, validator, ({ dialect: _LegacyExtractDialect(def), parameters: def.form.parameters }))
        ] : undefined;
        if(((typeof def.form !== "number") && ("parameters" in def.form)))
        {
            const statsService = GlobalInjector.Resolve(StatisticsCounterService);
            statsService.Increment(StatisticsCounter.LegacyVerbParameters);
        }

        validator.verbForm = {
            stativeActiveParticiple: ExtractActiveParticipleFlag(def.form),
            stem: stemNumber,
            variants,
            verbType
        };
    }
}

function ExtractActiveParticipleFlag(form: ParameterizedStemData | number): true | undefined
{
    if(typeof form === "number")
        return undefined;
    if((form.stem === 1) && ("variants" in form))
        return form["stative-active-participle"];
    return undefined;
}
