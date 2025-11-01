resource translatorService 'Microsoft.CognitiveServices/accounts@2025-06-01' = {
  name: 'openarabdict-translator'
  location: 'eastus'
  
  kind: 'TextTranslation'
  
  sku: {
    name: 'F0'
  }

  properties: {
  }
}

output cognitiveServiceKey string = listKeys(translatorService.id, '2024-10-01').key1
