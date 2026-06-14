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
import { TreeTrace } from "../TreeTrace";
import { WordDefinition } from "../DataDefinitions";
import { DefinitionValidator } from "./DefinitionValidator";
import { OpenArabDictGender, OpenArabDictPOSType, OpenArabDictVerbForm } from "@aczwink/openarabdict-domain";
import { DisplayVocalized } from "@aczwink/openarabicconjugation/dist/Vocalization";
import { LexicalUnitDefinitionValidator } from "./LexicalUnitDefinitionValidator";

export class SenseDefinitionValidator extends DefinitionValidator<"">
{
    constructor(wordDef: WordDefinition, _sourceTreeTrace?: TreeTrace)
    {
        super(wordDef, _sourceTreeTrace);

        this.lexicalUnitDefValidators = [];
    }

    //Properties
    public get lexicalUnits(): readonly LexicalUnitDefinitionValidator[]
    {
        return this.lexicalUnitDefValidators;
    }

    public get translations()
    {
        if(this.lexicalUnitDefValidators.length !== 1)
            this.ReportValidationError("Definition is complex");
        return this.lexicalUnitDefValidators[0].translations;
    }

    public set type(value: OpenArabDictPOSType | undefined)
    {
        this.LexicalUnit(0).type = value;
    }

    public get verbForm()
    {
        return this.LexicalUnit(0).verbForm;
    }

    public set verbForm(newValue: OpenArabDictVerbForm)
    {
        this.LexicalUnit(0).verbForm = newValue;
    }

    //Public methods
    public ConstructResult()
    {
        return {
            units: this.lexicalUnitDefValidators.map(x => x.ConstructResult())
        };
    }

    public LexicalUnit(index: number)
    {
        if(this.lexicalUnitDefValidators[index] === undefined)
            this.lexicalUnitDefValidators[index] = new LexicalUnitDefinitionValidator(this.wordDef, this.sourceTreeTrace);

        return this.lexicalUnitDefValidators[index];
    }

    //Protected methods
    protected Get(variable: ""): (string | DisplayVocalized[] | OpenArabDictGender | OpenArabDictPOSType) | undefined
    {
        throw new Error("Method not implemented.");
    }

    protected Set(variable: "", value: string | DisplayVocalized[] | OpenArabDictGender | OpenArabDictPOSType): void
    {
        throw new Error("Method not implemented.");
    }

    //State
    private lexicalUnitDefValidators: LexicalUnitDefinitionValidator[];
}