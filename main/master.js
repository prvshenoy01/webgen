// JS File for SBU WebGen

// NOTE: The fetch and the normalized heatmap function are the bottlenecks of the JS.
// NOTE: Ran the same fetch directly on Firebrowse and it took 50%-100% the time it took for this fetch call.
// NOTE: This likely means the site can't get too fast since Firebrowse will be a bottleneck.

// Master Function for Expression Frequency Distribution (EFD) Data to Plot:

getEFDdata = async function(cohortQuery, geneQuery) {
  // Getting mRNA-Seq data from GDC:
  var expressionArrayResults = await getExpressionValuesOnly(cohortQuery, geneQuery);
  var expressionArray = expressionArrayResults[0];
  var emptyGenesArray = expressionArrayResults[1];

  // Check that the fetch worked properly:
  if (expressionArray == 'Error: Invalid Input Fields for Query.') {
    return expressionArray;
  };

  // Remove any genes with no mRNA-Seq results:
  var geneQuery = geneQuery.filter(gene => emptyGenesArray.includes(gene) == false);

  // Get results to plot the heatmap:
  var heatmapVar = getDataToPlotForHeatmap(expressionArray, cohortQuery, geneQuery);
  var dataToReturn = heatmapVar[0];
  var layoutToReturn = heatmapVar[1];

  // Get results to plot the normalized heatmap:
  var normHeatmapVar = getDataToPlotForNormalizedAverageHeatmap(expressionArray, cohortQuery, geneQuery);
  dataToReturn.push(normHeatmapVar[0]);
  layoutToReturn.push(normHeatmapVar[1]);

  // Get results to plot the histograms:
  var histogramVar = getDataToPlotForHistogram(expressionArray, cohortQuery, geneQuery);
  var histogramVarLength = histogramVar[0].length;
  for (var i = 0; i < histogramVarLength; i++) {
    dataToReturn.push(histogramVar[0][i]);
    layoutToReturn.push(histogramVar[1][i]);
  };

  var resultsToReturn = [dataToReturn, layoutToReturn, emptyGenesArray];
  return resultsToReturn;  
};