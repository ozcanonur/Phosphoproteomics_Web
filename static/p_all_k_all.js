function show_cyto_P_all() {

    // Triggers on clicking see ALL button
    $('#perturbSeeAllBtn').on('click', function(event) {

        // Create a cytoscape graph instance
        let cy = cytoScapeStyle('cy');

        $.ajax({
            data: {
                perturbagen: $('#perturbagenSelect').val(),
                option: 'get_allfor_P'
            },
            type: 'POST',
            url: '/process_ajax'
        })
        .done(function (data) {

            let perturbagen = $('#perturbagenSelect').val();

            // Adds the perturbagen node
            cy.add([
                {group: 'nodes', data: {id: perturbagen}, position: {x: 50, y: 50}},
            ]);

            // Goes through all kinases and target affected by the selected perturbagen
            // and creates nodes and edges
            let prevKinase = '';
            let height = 50;
            let kinaseHeight = 50;
            for (let i = 0; i < data.length; i++, height += 75) {

                let currKinase = data[i][1];
                let currTarget = data[i][2];
                let currUporDown = data[i][3];
                let finalScore = data[i][7].toFixed(6);
                let edgeID = 'e' + i;
                let pToKID = perturbagen + currKinase + i;

                cy.add([
                    {group: 'nodes', data: {id: currKinase}, position: {x: 300, y: kinaseHeight}},
                    {group: 'nodes', data: {id: currTarget}, position: {x: 550, y: height}},
                    {group: 'edges', data: {id: edgeID, source: currKinase, target: currTarget, label: finalScore}}
                ]);

                if (currKinase != prevKinase) {
                    cy.add([
                        {group: 'edges', data: {id: pToKID, source: perturbagen, target: currKinase}}
                    ]);
                    kinaseHeight += 75;
                }
                prevKinase = currKinase;

                if (currUporDown == 'up') {
                    cy.edges('[id = "' + edgeID + '"]').style('line-color', '#ff0000');
                }
            }

            // Save to session cache
            let storage = JSON.stringify(arrayOfArraysToDict(data));
            sessionStorage.setItem('PKT_Data', storage);
        });

        cy.on('tap', 'node', function () {

            if (this.relativePoint().x == 550) {

                let storage = JSON.parse(sessionStorage.getItem('PKT_Data'));
                let index = storage.findIndex(storage => storage.target == this.id());

                $('#targetInfoID').html(storage[index].target);
                $('#effectInfoID').html(storage[index].properties.effect);
                $('#perturbsScoreInfoID').html(storage[index].properties.perturbsScore.toFixed(4));
                $('#colocalisationInfoID').html(storage[index].properties.colocScore.toFixed(4));
                $('#uniquenessInfoID').html(storage[index].properties.uniquenessScore.toFixed(4));
                $('#finalScoreInfoID').html(storage[index].properties.finalScore.toFixed(4));
            }
        });

        event.preventDefault();
    });

    return cy;
}

function show_cyto_K_all() {

    // Triggers on clicking see ALL button
    $('#kinaseSeeAllBtn').on('click', function(event) {

        // Create a cytoscape graph instance
        let cy = cytoScapeStyle('cy');

        $.ajax({
            data: {
                kinase: $('#kinaseSelect').val(),
                option: 'get_allfor_K'
            },
            type: 'POST',
            url: '/process_ajax'
        })
        .done(function (data) {

            let kinase = $('#kinaseSelect').val();

            let current_cy_width = $('#cy').css('width').split('.')[0];
            let kinase_width = current_cy_width / 2;

            // Adds the kinase node
            cy.add([
                {group: 'nodes', data: {id: kinase}, position: {x: kinase_width, y: 50}},
            ]);

            // Goes through all perturbagens and target affected by the selected perturbagen
            // and creates nodes and edges
            let height = 50;
            for (let i = 0; i < data.length; i++, height += 50) {

                let currPerturbagen = data[i][0];
                let score = data[i][2].toFixed(6);
                let edgeID = 'e' + i;

                cy.add([
                    {group: 'nodes', data: {id: currPerturbagen}, position: {x: 50, y: height}}
                ]);

                cy.add([
                    {group: 'edges', data: {id: edgeID, source: currPerturbagen, target: kinase, label: score}}
                ]);

                cy.edges('[id = "' + edgeID + '"]').style('line-color', '#ff0000');
            }

        });

        event.preventDefault();
    });

    return cy;
}