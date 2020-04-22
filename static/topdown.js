

var cy = cytoScapeStyle('cy-big');
function cytoScapeStyle(id) {
    let cy = cytoscape({

        container: document.getElementById(id),

        style: [ // the stylesheet for the graph
            {
                selector: 'node',
                style: {
                    'background-color': '#000000',
                    label: 'data(name)',
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 1,
                    'line-color': '#369',
                    'target-arrow-color': '#369',
                    'target-arrow-shape': 'triangle',
                    'label': 'data(label)',
                    'font-size': '20px',
                }
            }
        ],

        style: cytoscape.stylesheet()
        .selector('edge')
        .css({
            'width': 3,
            'line-color': '#ff0000',
            'target-arrow-color': '#369',
            'target-arrow-shape': 'triangle',
            'label': 'data(label)',
            'font-size': '18px',
            'color': 'black',
            'font-weight': 'bold',
            'text-margin-y': '-10px'
        })
        .selector('node')
        .css({
            'content': 'data(name)',
            'text-valign': 'center',
            'color': 'white',
            'text-outline-width': 2,
            'text-outline-color': 'black',
            'background-color': 'black',
            'shape': 'octagon',
            'width': '40px',
            'height': '40px',
            'font-size': '16pt'
        })
        .selector(':selected')
        .css({
            'background-color': 'black',
            'target-arrow-color': 'black',
            'source-arrow-color': 'black',
            'text-outline-color': 'black'
        }),
        layout: {
            name: 'grid',
            rows: 1
            // animate: 'end',
            // animationEasing: 'ease-out',
            // animationduration: 5000,
            // randomize: true
        },
        zoomingEnabled: false
    });

    return cy;
}


function top_down_pathway(event){

    // Empty the graph container and adjust buttons etc.
    $('#cy-big').css('visibility', 'visible');
    $('#cy-big').css('height', '1000px');

    $('#cy-big-PKinfo').css('visibility', 'visible');
    $('#cy-big-PKinfo').css('height', '1000px');

    $('#kinase-pathway-title').css('visibility', 'visible');
    $('#kinase-pathway-title').css('visibility', 'visible');
    $('#kinase-pathway-title').css('height', '');
    $('#kinase-pathway-title').css('padding', '10px');

    // let target_protein = 'DPYSL3';
    // let target_phosphosite = 'Thr509';
    //
    // // Dimensions of the cy container
    // let current_cy_width = $('#cy-big').css('width').split('.')[0];
    // let current_cy_height = $('#cy-big').css('height').split('.')[0];

    let perturbagen = 'Torin';
    let p_value = $('#secondary_pathway_pvalue').val();
    let cell_line = 'MCF-7';
    let start_protein = $('#secondary_pathway_start').val();

    $.ajax({
        data: {
            option: 'read_positions',
            p_value: p_value
        },
        type: 'POST',
        url: '/process_ajax'
        })
        .done(function (positions){

            let pos_dict = positions;
            let p_value = $('#secondary_pathway_pvalue').val();
            let start_protein = $('#secondary_pathway_start').val();

            $.ajax({
                data: {
                    option: 'get_top_down_pathway',
                    perturbagen: perturbagen,
                    p_value: p_value,
                    cell_line: cell_line,
                    start_protein: start_protein
                },
                type: 'POST',
                url: '/process_ajax'
            })
            .done(function (data){

                console.log(data);

                let first_node_width = 550;
                let first_node_height = -150;

                // Add the starting protein node
                add_cyto_node(cy, 'nodes', start_protein, start_protein,
                    first_node_width, first_node_height, false);

                let fold_change_dict = {};

                // Iterate through all possible paths
                for (let path of data){
                    // Iterate through the path
                    for (let i=1; i < path.length; i++){

                        let curr_protein = path[i][1];
                        let curr_phosphosite = path[i][2];
                        let curr_fold_change = path[i][4].toFixed(2);
                        let curr_p_value = path[i][5].toFixed(2);
                        let curr_cv = path[i][6].toFixed(2);
                        let curr_effect = path[i][8];
                        let curr_mechanism = path[i][9];

                        let prot_phospho = curr_protein + '_' + curr_phosphosite;
                        fold_change_dict[prot_phospho] = [curr_fold_change, curr_p_value, curr_cv];

                        // Add protein node if it doesn't exist
                        if(!cyto_element_exists_byID(cy, curr_protein)){

                            let prot_width = parseInt(pos_dict[curr_protein][0]);
                            let prot_height = parseInt(pos_dict[curr_protein][1]);

                            add_cyto_node(cy, 'nodes', curr_protein, curr_protein, prot_width, prot_height, false);
                        }
                        // Add phosphosite for this protein if it doesn't exist
                        if(!cyto_element_exists_byID(cy, prot_phospho)){

                            let phosphosite_width = parseInt(pos_dict[prot_phospho][0]);
                            let phosphosite_height = parseInt(pos_dict[prot_phospho][1]);

                            add_cyto_node(cy, 'nodes', prot_phospho, curr_phosphosite,
                                phosphosite_width, phosphosite_height, true);

                            add_cyto_edge(cy, 'edges', curr_protein + '_has_' + curr_phosphosite,
                                '', curr_protein, prot_phospho, '', true);
                        }

                        // Link current phosphosite to the previous kinase
                        let prev_protein;
                        if(i === 1){
                            prev_protein = path[0];
                        }
                        else{
                            prev_protein = path[i-1][1];
                        }

                        add_cyto_edge(cy, 'edges', curr_protein + '_affects_' + curr_phosphosite,
                                    '', prev_protein, prot_phospho, curr_mechanism, false);

                        // Change line color if it's an excitation
                        if(curr_effect === 'up'){
                            change_cyto_style_byID(cy, 'edges',
                                curr_protein + '_affects_' + curr_phosphosite, 'line-color', 'blue');
                        }
                    }
                }

                // Triggers on clicking the target node, populates the info pane
                cy.on('tap', 'node', function (event) {

                    let evtTarget = event.target;

                    if (evtTarget.id().split('_').length > 1) {

                        let curr_fold_change = fold_change_dict[evtTarget.id()][0];

                        evtTarget.qtip({
                            content: curr_fold_change,
                            show: {
                                event: event.type,
                                ready: true
                            },
                            hide: {
                                event: 'tap'
                            },
                            style: {
                                classes: 'qtip-youtube'
                            }
                        }, event);
                    }
                });

            });
        });


    event.preventDefault();
}
