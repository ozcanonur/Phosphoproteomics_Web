function bottom_up_pathway(event){

    // Empty the graph container and adjust buttons etc.
    $('#cy-big').css('visibility', 'visible');
    $('#cy-big').css('height', '1000px');

    $('#cy-big-PKinfo').css('visibility', 'visible');
    $('#cy-big-PKinfo').css('height', '1000px');

    $('#kinase-pathway-title').css('visibility', 'visible');
    $('#kinase-pathway-title').css('visibility', 'visible');
    $('#kinase-pathway-title').css('height', '');
    $('#kinase-pathway-title').css('padding', '10px');

    // Create a cytoscape graph instance
    let cy = cytoScapeStyle('cy-big');

    // End target
    let target_protein = 'DPYSL3';
    let target_phosphosite = 'Thr509';

    // Dimensions of the cy container
    let current_cy_width = $('#cy-big').css('width').split('.')[0];
    let current_cy_height = $('#cy-big').css('height').split('.')[0];

    cy.add([
        {group: 'nodes', data: {id: `${target_protein}(${target_phosphosite})`}, position: {x: current_cy_width / 2, y: current_cy_height - 50}}
    ]);

    bottom_up_pathway_kinase(cy, target_protein, target_phosphosite, 800);

    event.preventDefault();
}

function bottom_up_pathway_kinase(cy, target_protein, target_phosphosite, height){

    $.ajax({
        data: {
            target: target_protein,
            phosphosite: target_phosphosite,
            option: 'get_bottom_up_pathway_for_target'
        },
        type: 'POST',
        url: '/process_ajax'
    })
    .done(function (data){

        // Placement positions
        let current_cy_width = $('#cy-big').css('width').split('.')[0];
        let width_gap = (current_cy_width - 100) / (data.length - 1);
        let kinase_start_width = 50;

        // For every kinase affecting the current target
        for (let i = 0; i < data.length; i++, kinase_start_width += width_gap) {

            let currKinase = data[i][0];
            let currEffect = data[i][1];
            let currPhosphorylation_type = data[i][2];

            // Phosphorylation type
            let label;
            currPhosphorylation_type === "phosphorylation" ? label = '+p' : label = '-p';

            // Place the kinase and the edge connecting to the target
            cy.add([
                {group: 'nodes', data: {id: currKinase}, position: {x: kinase_start_width, y: height}},
                {group: 'edges',
                    data: {
                        id: target_phosphosite + '_to_' + currKinase,
                        source: `${target_protein}(${target_phosphosite})`,
                        target: currKinase,
                        label: label
                    }
                }
            ]);

            // Change the color of edge depending on effect:up or down
            if(currEffect.indexOf('down') === -1){
                cy.edges('[id="' + target_phosphosite + '_to_' + currKinase + '"]').style('line-color', 'blue');
            }

            // Put phosphosites
            bottom_up_pathway_phosphosites(cy, currKinase, kinase_start_width, height);
        }
    });
}

function bottom_up_pathway_phosphosites(cy, kinase, width, height){

    $.ajax({
        data: {
            target: kinase,
            phosphosite: 'all',
            option: 'get_bottom_up_pathway_for_target',
        },
        type: 'POST',
        url: '/process_ajax'
    })
    .done(function (data) {

        // Phosphosite positions
        let unique_data_length = unique_phosphosite_count(data);
        let phospho_start;
        if(unique_data_length % 2 === 0){
            phospho_start = width - (((unique_data_length / 2) - 1) * 50) - 25;
        }
        else{
            phospho_start = width - ((Math.floor(unique_data_length / 2)) * 50);
        }

        // Add phosphosites on top of currently affected kinase
        for (let i = 0; i < data.length; i++, phospho_start += 50){

            let currPhosphosite = data[i][3];

            // Check if the same phosphosite exists
            let node_exists = false;
            cy.nodes().some(function(ele) {
                if(currPhosphosite == ele.data().id) {
                    node_exists = true;
                    phospho_start -= 50;
                }
            });

            // Add new phosphosite node and connect it to the kinase
            if(!node_exists){
                cy.add([
                    {group: 'nodes', data: {id: currPhosphosite}, position: {x: phospho_start, y: height - 50}},
                    {group: 'edges',
                        data: {
                            id: kinase + '_to_' + currPhosphosite,
                            source: kinase,
                            target: currPhosphosite
                        }
                    }
                ]);

                // Phosphosite node styling
                cy.nodes('[id="' + currPhosphosite + '"]').style('width', '30px');
                cy.nodes('[id="' + currPhosphosite + '"]').style('height', '30px');
                cy.nodes('[id="' + currPhosphosite + '"]').style('font-size', '12pt');
                cy.nodes('[id="' + currPhosphosite + '"]').style('background-color', 'orange');
                cy.edges('[id="' + kinase + '_to_' + currPhosphosite + '"]').style('line-color', 'orange');
            }

            //let destination_target_kinase = kinase + '(' + currPhosphosite + ')';
            //show_kinases_affecting_target(cy, destination_target_kinase, currPhosphosite, width, height - 250 );
        }

    });
}

