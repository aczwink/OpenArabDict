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

resource openAIService 'Microsoft.CognitiveServices/accounts@2025-06-01' = {
  name: 'openarabdict-openai-translator'
  location: 'eastus'
  
  kind: 'OpenAI'
  
  sku: {
    name: 'S0'
  }

  properties: {
  }
}

resource modelDeployment 'Microsoft.CognitiveServices/accounts/deployments@2025-10-01-preview' = {
  parent: openAIService
  name: 'gpt-4o'
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o'
      version: '2024-08-06'
    }
  }
  sku: {
    name: 'Standard'
    capacity: 50
  }
}

output cognitiveServiceKey string = listKeys(translatorService.id, '2024-10-01').key1
