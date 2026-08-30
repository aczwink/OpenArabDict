/**
 * OpenArabDict
 * Copyright (C) 2026 Amir Czwink (amir130@hotmail.de)
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
import crypto from "crypto";
import { OpenArabDictTranslationDocument, OpenArabDictTranslationEntry } from "@aczwink/openarabdict-domain";
import { TargetTranslationLanguage, TranslationError, Translator } from "../Translator";
import { Dictionary } from "@aczwink/acts-util-core";

export class CachedTranslator implements Translator
{
    constructor(private mapping: Dictionary<string>, targetTranslations: OpenArabDictTranslationDocument, private inner: Translator)
    {
        this.lookupTable = this.ComputeLookupTable(targetTranslations);
        this._targetMapping = {};
    }

    //Properties
    public get targetMapping()
    {
        return this._targetMapping;
    }

    //Public methods
    public async Translate(lexicalUnitId: string, translations: OpenArabDictTranslationEntry[], targetLanguage: TargetTranslationLanguage): Promise<OpenArabDictTranslationEntry[] | TranslationError>
    {
        const storedHash = this.mapping[lexicalUnitId];
        const computedHash = this.ComputeMappingHash(translations);
        if(computedHash === storedHash)
            return this.ReturnCachedVersion(lexicalUnitId);

        const result = await this.inner.Translate(lexicalUnitId, translations, targetLanguage);
        if(Array.isArray(result))
        {
            this._targetMapping[lexicalUnitId] = computedHash;
            return result;
        }
        
        console.error("Error: " + result);
        return this.ReturnCachedVersion(lexicalUnitId);
    }

    //Private methods
    private ComputeLookupTable(targetTranslations: OpenArabDictTranslationDocument)
    {
        const dict: Dictionary<OpenArabDictTranslationEntry[]> = {};
        for(let i = 0; i < targetTranslations.entries.length; i++)
        {
            const entry = targetTranslations.entries[i];
            dict[entry.lexicalUnitId] = entry.translations;
        }
        return dict;
    }

    private ComputeMappingHash(translations: OpenArabDictTranslationEntry[])
    {
        const text = JSON.stringify(translations);

        return crypto.createHash("md5").update(text).digest("hex");
    }

    private ReturnCachedVersion(lexicalUnitId: string)
    {
        const storedHash = this.mapping[lexicalUnitId];
        this._targetMapping[lexicalUnitId] = storedHash;
        return this.lookupTable[lexicalUnitId]!;
    }

    //State
    private lookupTable: Dictionary<OpenArabDictTranslationEntry[]>;
    private _targetMapping: Dictionary<string>;
}