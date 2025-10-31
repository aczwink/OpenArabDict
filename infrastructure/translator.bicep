resource translatorService 'Microsoft.CognitiveServices/accounts@2025-06-01' = {
  name: 'openarabdict-translator'
  location: 'eastus'
  
  kind: 'TextTranslation'
  
  sku: {
    name: 'F0'
  }
}
