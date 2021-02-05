  
  // ***** Get ALL barcodes from selected pie sectors (below) *****

getDataFromSelectedPieSectors = async function(expressionData) {

  // clinicalValues is an array of key value pairs for gene(s) selected and mutation(s) selected
  let clickedGenes = Object.keys(clinicalValues);
  let concatFilteredBarcodes = [];

  // LOOP THRU ALL CLICKED GENES
  for(let i = 0; i < clickedGenes.length; i++) {

    let currentGene = clickedGenes[i];

    await getAllVariantClassifications(currentGene).then(function(mutationData) { // get ALL mutation data for current gene of the selected genes

      // LOOP THRU ALL CLICKED "MUTATIONS"
      let clickedMutations = clinicalValues[currentGene];
      for(let j = 0; j < clickedMutations.length; j++) {
        let currentMutation = clickedMutations[j];
        // IF CURRENT **"MUTATION" IS NOT WILD TYPE**, then get the associated barcodes from mutation api's data
        if(currentMutation != "Wild_Type") {
          let allData = mutationData.filter(person => (person.Variant_Classification == currentMutation));
          let onlyBarcodes = allData.map(x => x.Tumor_Sample_Barcode);
          let trimmedOnlyBarcodes = onlyBarcodes.map(x => x.slice(0,12));

          // we need to perform filtering to get only unique barcodes because some genes with a given
          // mutation type will result in more than one type of protein change... this will result in
          // a barcode appearing more than once in the data
          function onlyUnique(value, index, self) {
            return self.indexOf(value) === index;
          }
          let uniqueTrimmedOnlyBarcodes = trimmedOnlyBarcodes.filter(onlyUnique);

          if(concatFilteredBarcodes['' + currentGene] == undefined)
            concatFilteredBarcodes['' + currentGene] = uniqueTrimmedOnlyBarcodes;
          else 
            concatFilteredBarcodes['' + currentGene] += uniqueTrimmedOnlyBarcodes;
        
        // IF CURRENT **"MUTATION IS WILD TYPE"**, then get the associated barcodes
        } else {

          // IF NO MUTATIONS EXIST AT ALL FOR THE CURRENT GENE, then get the associated barcodes from mRNAseq api's data
          if(mutationData == undefined) {
            let allData = expressionData.filter(person => person.gene == currentGene);
            let onlyBarcodes = allData.map(x => x.tcga_participant_barcode);
            if(concatFilteredBarcodes['' + currentGene] == undefined)
              concatFilteredBarcodes['' + currentGene] = onlyBarcodes;
            else
              concatFilteredBarcodes['' + currentGene] += onlyBarcodes;

          // IF THE GENE HAS SOME MUTATIONS AND SOME WILD-TYPE, then get the associated barcodes by subtracting mutation data from expression data
          } else {
            
            let allData_1 = mutationData.filter(person => person.Hugo_Symbol == currentGene);
            let onlyBarcodes_1 = allData_1.map(x => x.Tumor_Sample_Barcode);
            let trimmedOnlyBarcodes_1 = onlyBarcodes_1.map(x => x.slice(0,12));

            allData_2 = expressionData.filter(person => person.gene == currentGene);
            onlyBarcodes_2 = allData_2.map(x => x.tcga_participant_barcode);

            let barcodesForWildType = [];
            for(let i = 0; i < onlyBarcodes_2.length; i++)
              if(!trimmedOnlyBarcodes_1.includes(onlyBarcodes_2[i]))
                barcodesForWildType.push(onlyBarcodes_2[i]);
            if(concatFilteredBarcodes['' + currentGene] == undefined)
              concatFilteredBarcodes['' + currentGene] = barcodesForWildType;  
            else
              concatFilteredBarcodes['' + currentGene] += barcodesForWildType;
          }
        }
      }
    })
  }
  
  // Get intersection of barcodes from selected pie sectors

  let clicked_gene_mutation = Object.keys(concatFilteredBarcodes);
  let intersectedBarcodes;

  // If user clicked 0 or 1 gene/mutation combos, simply use these barcodes
  if(clicked_gene_mutation.length <= 1) {
    let currentGene = clicked_gene_mutation[0];
    intersectedBarcodes = concatFilteredBarcodes[currentGene]; // barcode(s) for selected gene mutation combo in given cancer type

  // If user clicked >1 gene/mutation combos, compute intersection
  } else {
    for(let i = 0; i < clicked_gene_mutation.length - 1; i++) {
      let current_gene_mutation = clicked_gene_mutation[i];
      let next_gene_mutation = clicked_gene_mutation[i + 1];
      let barcodesForCurrentGene = concatFilteredBarcodes[current_gene_mutation]; // barcode(s) for selected gene mutation combo in given cancer type
      let barcodesForNextGene = concatFilteredBarcodes[next_gene_mutation];
      intersectedBarcodes = barcodesForCurrentGene.filter(x => barcodesForNextGene.includes(x));
    }  
  }

  // if there are NO barcodes at the intersection, we cannot build gene expression visualizations
  if(intersectedBarcodes.length == 0) {

    // Remove the loader
    document.getElementById('heatmapDiv0').classList.remove('loader');
    document.getElementById('svgViolinDiv0').classList.remove('loader');

    let sorryDiv = document.getElementById("sorryDiv");
    sorryDiv.innerHTML = "";
    para = document.createElement("P");
    para.setAttribute('style', 'text-align: center; color: black; font-family: Georgia, "Times New Roman", Times, serif');
    para.setAttribute('id', 'noIntersectPara');        
    para.innerText = "No patient barcodes exist for the combination of pie sectors selected.";  
    sorryDiv.appendChild(para);

  // if no pie sectors were selected, tell the user to select some
  } else if(intersectedBarcodes == 0) {
      // Remove the loader
      document.getElementById('heatmapDiv0').classList.remove('loader');
      document.getElementById('svgViolinDiv0').classList.remove('loader');
  
      let sorryDiv = document.getElementById("sorryDiv");
      sorryDiv.innerHTML = "";
      para = document.createElement("P");
      para.setAttribute('style', 'text-align: center; color: black; font-family: Georgia, "Times New Roman", Times, serif');
      para.setAttribute('id', 'noIntersectPara');        
      para.innerText = "To visualize data, please select at least one pie chart sector.";

  // if there IS/ARE barcode(s) at the intersection, build heatmap and violin plots
  } else {
    sorryDiv.innerHTML = "";
    // Filter expression data based on intersection of barcodes
    // The final data array may include a fewer number of barcodes than that contained in 
    // the intersectedBarcodes array if RNAseq data is not available for all patient barcodes
    // contained in intersectedBarcodes
    let data = [];
    for(let i = 0; i < intersectedBarcodes.length; i++) 
      for(let j = 0; j < expressionData.length; j++) 
        if(expressionData[j].tcga_participant_barcode == intersectedBarcodes[i])
          data.push(expressionData[j])
    data = data.filter(x => clickedGenes.includes(x.gene))
    return data;
  }

}
