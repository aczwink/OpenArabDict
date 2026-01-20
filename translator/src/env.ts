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

require('dotenv').config();

export const ENV = {
    azureOpenAI: {
        key: process.env.OPENARABDICT_TRANSLATOR_AZURE_OPENAI_KEY!,
        region: process.env.OPENARABDICT_TRANSLATOR_AZURE_OPENAI_REGION!,
    },
    azureTranslator: {
        key: process.env.OPENARABDICT_TRANSLATOR_AZURE_TRANSLATOR_KEY!,
        region: process.env.OPENARABDICT_TRANSLATOR_AZURE_TRANSLATOR_REGION!,
    },
    implementation: process.env.OPENARABDICT_TRANSLATOR_IMPLEMENTATION! as "azure-translator" | "azure-openai" | "azure-openai-azure-translator-fallback",
};