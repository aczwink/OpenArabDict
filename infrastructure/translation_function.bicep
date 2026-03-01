param dbContainerName string
param location string
param storageAccountName string

resource funcASP 'Microsoft.Web/serverfarms@2025-03-01' = {
  name: 'openarabdict-function-asp'
  location: location

  properties: {
    reserved: false
  }
  sku: {
    name: 'Y1'
  }
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

resource funcApp 'Microsoft.Web/sites@2025-03-01' = {
  name: 'openarabdict-translation-functionapp'
  location: location
  kind: 'functionapp'

  properties: {
    serverFarmId: funcASP.id

    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
      ]
      nodeVersion: '~20'
    }
  }
}

resource translationFunc 'Microsoft.Web/sites/functions@2025-03-01' = {
  name: 'translation-function'
  parent: funcApp

  properties: {
    config: {
      bindings: [
        {
            type: 'eventGridTrigger'
            name: 'eventGridEvent'
            direction: 'in'
        }
      ]
    }
  }
}

resource eventGridSubscription 'Microsoft.EventGrid/eventSubscriptions@2025-02-15' = {
  name: 'translate-on-dictionary-change'
  scope: storageAccount

  properties: {
    destination: {
      endpointType: 'AzureFunction'
      properties: {
        resourceId: translationFunc.id
      }
    }
    filter: {
      includedEventTypes: [
        'Microsoft.Storage.BlobCreated'
      ]
      subjectBeginsWith: '/blobServices/default/containers/${dbContainerName}/blobs/'
      subjectEndsWith: 'en.json'
    }
  }
}
