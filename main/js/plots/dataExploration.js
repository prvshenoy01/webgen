
////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////// Generate pie charts for selected features ///////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

let clickedSlices = [];

let buildDataExplorePlots = async function() {

    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }

    let mySelectedClinicalFeatures = $('.clinicalMultipleSelection').select2('data').map(clinicalInfo => clinicalInfo.text);

    if(mySelectedClinicalFeatures.length == 0) {

    } else {

        // clear all previous plots that were displayed
        document.getElementById('dataexploration').innerHTML = "";

        for(let i = 0; i < mySelectedClinicalFeatures.length; i++) {

            let currentFeature = mySelectedClinicalFeatures[i];
            let allValuesForCurrentFeature = []; 
            let mutationsForThisGene;
            let uniqueValuesForCurrentFeature = [];
            let xCounts = [];

            // if current feature is a gene
            if(currentFeature[0] === currentFeature[0].toUpperCase()) {
                let allVariantClassifications = [];
                let allBarcodes = []; // barcodes that correspond to a mutation
                await getAllVariantClassifications(currentFeature).then(function(result) {
                    mutationsForThisGene = result;
                    if (mutationsForThisGene != undefined) {
                        for(let i = 0; i < mutationsForThisGene.length; i++) {
                            allVariantClassifications.push(mutationsForThisGene[i].Variant_Classification); 
                            allBarcodes.push(mutationsForThisGene[i].Tumor_Sample_Barcode); 
                        }
                    }
                }); 
                if (mutationsForThisGene != undefined) {
                    uniqueValuesForCurrentFeature = allVariantClassifications.filter(onlyUnique);
                    xCounts.length = uniqueValuesForCurrentFeature.length;
                    for(let i = 0; i < xCounts.length; i++) {
                        xCounts[i] = 0;
                    }
                    for(let i = 0; i < allClinicalData.length; i++) {
                        for(let k = 0; k < allVariantClassifications.length; k++) {
                            let trimmedCurrentBarcode = allBarcodes[k].slice(0, 12);
                            if(trimmedCurrentBarcode == allClinicalData[i].tcga_participant_barcode) {
                                xCounts[uniqueValuesForCurrentFeature.indexOf( allVariantClassifications[k] )]++;
                            }
                        }
                    }

                    let numWildType = 0;
                    for(let i = 0; i < allClinicalData.length; i++) {
                        for(let k = 0; k < allVariantClassifications.length; k++) {
                            let trimmedCurrentBarcode = allBarcodes[k].slice(0, 12);
                            if(trimmedCurrentBarcode != allClinicalData[i].tcga_participant_barcode) {
                                numWildType++;
                            }
                        }
                    }
                    uniqueValuesForCurrentFeature.push("wild-type");
                    xCounts.push(numWildType);    

                } else {
                    for(let i = 0; i < allClinicalData.length; i++) {
                        uniqueValuesForCurrentFeature.push("wild-type");
                    }
                    xCounts = allClinicalData.length;
                }

            // if current feature is clinical (i.e., not a gene)
            } else {
                for(let i = 0; i < allClinicalData.length; i++) 
                    allValuesForCurrentFeature.push(allClinicalData[i][currentFeature]);
                uniqueValuesForCurrentFeature = allValuesForCurrentFeature.filter(onlyUnique);
                xCounts.length = uniqueValuesForCurrentFeature.length;
                for(let i = 0; i < xCounts.length; i++)
                    xCounts[i] = 0;
                console.log(allClinicalData[0][currentFeature]) // i.e., ~first~ patient's ethnicity
                for(let i = 0; i < allClinicalData.length; i++) 
                    for(let k = 0; k < uniqueValuesForCurrentFeature.length; k++) 
                        if(allClinicalData[i][currentFeature] == uniqueValuesForCurrentFeature[k]) 
                            xCounts[k]++;
            }
        
            var data = [{
                values: xCounts,
                labels: uniqueValuesForCurrentFeature,
                type: 'pie',
                textinfo: "label+percent",
                textposition: "outside",
                marker: {
                    colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728',
                    '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
                    line: {
                        color: 'black', 
                        width: 1
                    }
                }
            }];
            
            var layout = {
                height: 400,
                width: 500,
                title: currentFeature + "",
                showlegend: true,
                extendpiecolors: true
            };
        
            let parentRowDiv = document.getElementById("dataexploration");        
            let newDiv = document.createElement("div");
            newDiv.setAttribute("class", "col s4");
            newDiv.setAttribute("id", currentFeature + "Div");
            parentRowDiv.appendChild(newDiv);
            
            Plotly.newPlot(currentFeature + 'Div', data, layout, {scrollZoom: true});


////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////// On-click event for pie charts below ///////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

            document.getElementById(currentFeature + 'Div').on('plotly_click', function(data) {
                var pts = '';
                var colore;
                var tn = '';
                var slice = '';
                for(let i = 0; i < data.points.length; i++) {
                    pts = data.points[i].pointNumber;
                    tn = data.points[i].curveNumber;
                    colore = data.points[i].data.marker.colors;
                    slice = data.points[i].label;
                }
                if(clickedSlices[currentFeature] != null){
                    clickedSlices[currentFeature].push(slice);
                }
                else
                    clickedSlices[currentFeature] = [slice];
                
                colore[pts] = '#FFF34B';
                var update = {'marker': {colors: colore, 
                                        line: {color: 'black', width: 1}}};
                Plotly.restyle(currentFeature + 'Div', update, [tn], {scrollZoom: true});
            });

        }

    }


}