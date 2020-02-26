function cytoScapeStyle(id) {
    let cy = cytoscape({

        container: document.getElementById(id),

        style: [ // the stylesheet for the graph
            {
                selector: 'node',
                style: {
                    'background-color': '#000000',
                    'label': 'data(id)',
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
            'content': 'data(id)',
            'text-valign': 'center',
            'color': 'white',
            'text-outline-width': 2,
            'text-outline-color': 'black',
            'background-color': 'black',
            'shape': 'octagon',
            'width': '40px',
            'height': '40px'
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

function arrayOfArraysToDict(arrayList) {
    let objectList = [];

    for (let i=0;i<arrayList.length;i++){
        let array = arrayList[i];

        let object = {perturbagen:array[0], kinase:array[1], target:array[2], properties:
                {effect:array[3], perturbsScore:array[4], colocScore:array[5], uniquenessScore:array[6], finalScore:array[7]}};

        objectList.push(object);
    }

    return objectList;
}