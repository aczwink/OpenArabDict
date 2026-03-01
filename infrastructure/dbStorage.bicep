param location string
param servicePrincipalObjectId string

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'openarabdictdbstorage'
  location: location

  kind: 'StorageV2'
  properties: {
    allowSharedKeyAccess: true //required for mounting
  }
  sku: {
    name: 'Standard_LRS'
  }
}

resource blobServices 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

resource dbContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobServices
  name: 'dbstorage'
}

var storageBlobDataContributorRoleDefinitionId = '/providers/Microsoft.Authorization/roleDefinitions/ba92f5b4-2d11-453d-a403-e96b0029c9fe'
resource storageBlobContributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: dbContainer
  name: guid(storageAccount.id, dbContainer.id, servicePrincipalObjectId, storageBlobDataContributorRoleDefinitionId)
  properties: {
    roleDefinitionId: storageBlobDataContributorRoleDefinitionId
    principalId: servicePrincipalObjectId
    principalType: 'ServicePrincipal'
  }
}

output storageAccountName string = storageAccount.name
output dbContainerName string = dbContainer.name
