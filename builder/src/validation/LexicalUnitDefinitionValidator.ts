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

import { OpenArabDictGender, OpenArabDictPartOfSpeech, OpenArabDictPOSType, OpenArabDictTranslationEntry, OpenArabDictVerbForm } from "@aczwink/openarabdict-domain";
import { TreeTrace } from "../TreeTrace";
import { WordDefinition } from "../DataDefinitions";
import { DefinitionValidator } from "./DefinitionValidator";

export class LexicalUnitDefinitionValidator extends DefinitionValidator<"gender">
{
    constructor(wordDef: WordDefinition, _sourceTreeTrace?: TreeTrace)
    {
        super(wordDef, _sourceTreeTrace);
    }

    //Properties
    public get __legacyType()
    {
        return this._type;
    }

    public get gender()
    {
        if(this._gender === undefined)
            this.ReportValidationError("Gender missing");
        return this._gender!;
    }
    
    public get translations()
    {
        if(this._translations === undefined)
            this.ReportValidationError("Translations missing");
        return this._translations!;
    }

    public set translations(value: OpenArabDictTranslationEntry[])
    {
        this._translations = value;
    }

    public get type(): OpenArabDictPOSType
    {
        if(this._type === undefined)
            this.ReportValidationError("Word type missing");
        return this._type!;
    }

    public set type(value: OpenArabDictPOSType | undefined)
    {
        if(this._type === value)
            return;

        if(this._type !== undefined)
            this.ReportValidationError("Can't change word type");
        this._type = value;
    }

    public get verbForm()
    {
        if(this.type !== OpenArabDictPOSType.Verb)
            this.ReportValidationError("Verb forms do only exist on verbs");
        if(this._verbForm === undefined)
            this.ReportValidationError("Verb form not set");

        return this._verbForm!;
    }

    public set verbForm(newValue: OpenArabDictVerbForm)
    {
        if(this.type !== OpenArabDictPOSType.Verb)
            this.ReportValidationError("Verb forms do only exist on verbs");
        this._verbForm = newValue;
    }

    //Public methods
    public ConstructResult()
    {
        return {
            pos: this.ConstructPOS(),
            translations: this._translations ?? [],
        };
    }

    InferAnyOf(variable: "gender", allowedValues: OpenArabDictGender[], defaultValue: OpenArabDictGender): void;
    public InferAnyOf(variable: "gender", allowedValues: (OpenArabDictGender)[], defaultValue: OpenArabDictGender)
    {
        return super.InferAnyOfImpl(variable, allowedValues, defaultValue);
    }

    InferDefault(variable: "gender", defaultValue: OpenArabDictGender): void;
    public InferDefault(variable: "gender", defaultValue: OpenArabDictGender)
    {
        return super.InferDefaultImpl(variable, defaultValue);
    }

    InferValue(variable: "gender", value: OpenArabDictGender): void;
    public InferValue(variable: "gender", value: OpenArabDictGender)
    {
        return super.InferValueImpl(variable, value);
    }

    //Protected methods
    protected Get(variable: "gender")
    {
        switch(variable)
        {
            case "gender":
                return this._gender;
        }
    }

    protected Set(variable: "gender", value: OpenArabDictGender): void
    {
        switch(variable)
        {
            case "gender":
                this._gender = value;
        }
    }

    //Private methods
    private ConstructPOS(): OpenArabDictPartOfSpeech
    {
        switch(this.type)
        {
            case OpenArabDictPOSType.Adjective:
            case OpenArabDictPOSType.Noun:
            case OpenArabDictPOSType.Numeral:
            case OpenArabDictPOSType.Pronoun:
                return {
                    gender: this.gender,
                    type: this.type
                };

            case OpenArabDictPOSType.Verb:
                return {
                    type: this.type,
                    form: this.verbForm,
                    rootId: "" //TODO!!! set in wordprocessor
                };
        }

        return {
            type: this.type,
        };
    }

    //State
    private _gender?: OpenArabDictGender;
    private _verbForm?: OpenArabDictVerbForm;
    private _translations?: OpenArabDictTranslationEntry[];
    private _type?: OpenArabDictPOSType;
}