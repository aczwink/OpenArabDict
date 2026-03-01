param location string = resourceGroup().location
param translationLocation string
param servicePrincipalObjectId string

module dbStorage './dbStorage.bicep' = {
  params: {
    location: location
    servicePrincipalObjectId: servicePrincipalObjectId
  }
}

module function './translation_function.bicep' = {
  params: {
    dbContainerName: dbStorage.outputs.dbContainerName
    location: translationLocation
    storageAccountName: dbStorage.outputs.storageAccountName
  }
}

module aiServices './translation_services.bicep' = {
  params: {
    location: translationLocation
  }
}
