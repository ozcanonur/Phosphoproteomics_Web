from flask import Flask, render_template, request, jsonify
import sqlite3
import pandas as pd


app = Flask(__name__)


@app.route('/', methods=['GET', 'POST'])
def index():
    conn = sqlite3.connect("chemphopro.db")

    # Get Perturbagen list
    df = pd.read_sql_query('Select distinct perturbagen from Observation where fold_change < 0'
                           ' and fold_change > -888', conn)
    perturbagenList = df.values.tolist()

    # Get Kinase list
    df = pd.read_sql_query('Select distinct kinase from KS_relationship', conn)
    kinaseList = df.values.tolist()

    # Return index.html with perturbagen and kinase list filled
    return render_template('index.html', perturbagenList=perturbagenList,
                           kinaseList=kinaseList)

# Processing ajax requests
@app.route('/process_ajax', methods=['POST'])
def process_ajax():

    conn = sqlite3.connect("chemphopro.db")
    # Get the option from the ajax request
    option = request.form['option']

    # Return filtered kinase list depending on the Perturbagen & Kinase interactions
    if option == 'filter_kinase':
        perturbagen = request.form['perturbagen']

        queryString = "Select distinct kinase from results_PK where perturbagen=\'{}\'".format(perturbagen)
        df = pd.read_sql_query(queryString, conn)

        return jsonify(df.values.tolist())

    # Return all interactions with scores for this Perturbagen & Kinase combo
    elif option == 'get_PKT':
        perturbagen = request.form['perturbagen']
        kinase = request.form['kinase']

        queryString = "Select Perturbagen, Kinase, Target, Effect, Perturbs_Score, Coloc_Score, KT_Assoc_Score, Score " \
                      "from results_PKT where perturbagen = '{}' and kinase = '{}'".format(perturbagen, kinase)

        df = pd.read_sql_query(queryString, conn)
        df.sort_values(by=['Score'], inplace=True, ascending=False)

        return jsonify(df.values.tolist())

    # Return all interactions for this Perturbagen
    elif option == 'get_allfor_P':
        perturbagen = request.form['perturbagen']

        queryString = "Select Perturbagen, Kinase, Target, Effect, Perturbs_Score, Coloc_Score, KT_Assoc_Score, Score " \
                      "from results_PKT where perturbagen = '{}'".format(perturbagen)

        df = pd.read_sql_query(queryString, conn)
        df.sort_values(by=['Kinase', 'Target', 'Score'], inplace=True)

        return jsonify(df.values.tolist())

    # Return all interactions for this Kinase
    elif option == 'get_allfor_K':

        kinase = request.form['kinase']

        queryString = "Select Perturbagen, Kinase, Score " \
                      "from results_PK where kinase = '{}' order by Score desc limit 10".format(kinase)

        df = pd.read_sql_query(queryString, conn)

        return jsonify(df.values.tolist())

    # Return Perturbagen & Kinase scores by applying majority rule
    elif option == 'get_PK':

        perturbagen = request.form['perturbagen']
        kinase = request.form['kinase']

        queryString = "Select * from results_PKT where perturbagen = '{}' and kinase = '{}'".format(perturbagen, kinase)

        df = pd.read_sql_query(queryString, conn)

        downSum = df.loc[df['Effect'] == 'down', 'Score'].sum()
        upSum = df.loc[df['Effect'] == 'up', 'Score'].sum()
        ratio = downSum * (downSum / (downSum + upSum))

        result = [perturbagen, kinase, ratio]

        return jsonify(result)

    # Return perturbation details(fc, p, ..) for the selected P & K & T combo
    elif option == 'get_perturbs_details':

        perturbagen = request.form['perturbagen']
        target = request.form['target']

        queryString = "Select Perturbagen, substrate as target, fold_change, p_value, cv from Observation where " \
                      "cell_line = 'MCF-7' and perturbagen = '{}' and target = '{}'".format(perturbagen, target)

        df = pd.read_sql_query(queryString, conn)

        return jsonify(df.values.tolist())

    # Return colocalisation details(secretory, cytosol probs etc..) for selected P & K & T combo
    elif option == 'get_coloc_details':

        kinase = request.form['kinase']
        target = request.form['target']

        if len(target.split('(')) == 2:
            target = target.split('(')[0]

        queryString = 'Select * from protein_loc where protein = "{}" or protein = "{}"'.format(kinase, target)

        df = pd.read_sql_query(queryString, conn)

        return jsonify(df.values.tolist())

    # Return uniqueness scores for the selected target
    elif option == 'get_uniqueness_details':

        target = request.form['target']

        queryString = "Select Kinase, Target, Score from results_kinase_effectiveness " \
                      "where target = '{}'".format(target)

        df = pd.read_sql_query(queryString, conn)
        df.sort_values(by='Score', inplace=True, ascending=False)

        return jsonify(df.values.tolist())

    elif option == 'get_kinase_similarity_perturbagen_details':

        kinase = request.form['kinase']

        queryString = 'select * from results_similarity_perturbagen ' \
                      'where K1 = "{}" order by Ratio desc limit 7'.format(kinase)

        df = pd.read_sql_query(queryString, conn)

        return jsonify(df.values.tolist())

    elif option == 'get_kinase_similarity_target_details':

        kinase = request.form['kinase']

        queryString = 'select * from results_similarity_target ' \
                      'where K1 = "{}" order by Ratio desc limit 7'.format(kinase)

        df = pd.read_sql_query(queryString, conn)

        return jsonify(df.values.tolist())

    elif option == 'get_pathway_for_kinase':

        kinase = request.form['kinase']

        # TODO ACTUALLY NEEDS DESCENDING, AND NO LIMIT
        queryString = 'select Target, Score from kt_assoc where Kinase = "{}" order by Score limit 7'.format(kinase)

        df = pd.read_sql_query(queryString, conn)

        return jsonify(df.values.tolist())

    elif option == 'get_pathway_for_PK':

        kinase = request.form['kinase']

        queryString = 'select Perturbagen, Score from results_PK where kinase = "{}" order by Score desc'.format(kinase)

        df = pd.read_sql_query(queryString, conn)

        return jsonify(df.values.tolist())

    elif option == 'get_bottom_up_pathway_for_target':

        target = request.form['target']
        phosphosite = request.form['phosphosite']

        if phosphosite == 'all':
            queryString = 'select ENTITYA, EFFECT, MECHANISM, RESIDUE from human_pathway_relations where ' \
                          'ENTITYB = "{}" and RESIDUE not null limit 3'.format(target)
        else:
            queryString = 'select ENTITYA, EFFECT, MECHANISM from human_pathway_relations ' \
                          'where ENTITYB = "{}" and RESIDUE = "{}" limit 2'.format(target, phosphosite)

        df = pd.read_sql_query(queryString, conn)

        return jsonify(df.values.tolist())

    elif option == 'get_bottom_up_pathway_for_target_2':

        target = request.form['target']
        phosphosite = request.form['phosphosite']

        queryString = 'select y.ENTITYA as left_kinase, x.ENTITYA as mid_kinase, y.residue as mid_res, ' \
                      'x.ENTITYB as right_kinase, x.residue as right_res, x.Effect as right_effect, x.Mechanism as right_mech ' \
                      'from human_pathway_relations as x ' \
                      'left outer join human_pathway_relations as y on x.ENTITYA = y.ENTITYB ' \
                      'where x.ENTITYB = "{}" and x.RESIDUE = "{}" limit 3'.format(target, phosphosite)

        df = pd.read_sql_query(queryString, conn)

        return jsonify(df.values.tolist())

    elif option == 'get_top_down_pathway':

        perturbagen = request.form['perturbagen']
        p_value = request.form['p_value']
        cell_line = request.form['cell_line']
        start_protein = request.form['start_protein']

        obs_dict = dict_unique_phospho_obs(perturbagen, p_value, cell_line)
        rel_dict = kinase_to_kinasePhospho_dict()

        paths = topdown_path(rel_dict, obs_dict, start_protein)
        for path in paths:
            print(path)
        return jsonify(paths)

    elif option == 'read_positions':

        f = open('positions_mtor.txt', 'r')
        lines = f.readlines()

        pos_dict = {}
        for line in lines:

            node_id = line.split(':')[0]
            node_posx = line.split('[')[1].split(',')[0]
            node_posy = line.split(', ')[1].split(']')[0]

            pos_dict[node_id] = [node_posx, node_posy]

        return jsonify(pos_dict)


if __name__ == '__main__':
    app.run(debug=True)

def kinase_to_kinasePhospho_dict(dict={}):
    conn = sqlite3.connect("C:/Users/Onur/PycharmProjects/Flasky/chemphopro.db")

    df = pd.read_sql_query('select distinct ENTITYA, ENTITYB, RESIDUE, effect, mechanism '
                           'from human_pathway_relations where ENTITYA != ENTITYB and effect != "unknown" order by ENTITYB, RESIDUE',
                           conn)

    for index, row in df.iterrows():
        affecting_kinase = row[0]
        affected_kinase = row[1]
        affected_phosphosite = row[2]
        affected_effect = row[3]
        affected_mechanism = row[4]

        if 'up' in affected_effect:
            effect = 'up'
        else:
            effect = 'down'

        if 'de' in affected_mechanism:
            mechanism = '-p'
        else:
            mechanism = '+p'

        new_entry = affected_kinase + '_' + affected_phosphosite + '_' + effect + '_' + mechanism

        if affecting_kinase in dict:
            if new_entry not in dict[affecting_kinase]:

                curr_value = dict[affecting_kinase][:]
                curr_value.append(new_entry)

                dict[affecting_kinase] = curr_value

        else:
            dict[affecting_kinase] = [new_entry]

    return dict


def dict_unique_phospho_obs(perturbagen, p_threshold, cell_line=None, dict={}):
    conn = sqlite3.connect("C:/Users/Onur/PycharmProjects/Flasky/chemphopro.db")

    queryString = 'select * from Observation_new ' \
                  'where perturbagen = "{}" and p_value < {} ' \
                  'and cell_line = "{}"'.format(perturbagen, p_threshold, cell_line)

    df = pd.read_sql_query(queryString, conn)

    for index, row in df.iterrows():

        entry_info = [perturbagen, row['protein'],
                                row['phosphosite'], row['cell_line'], row['fold_change'],
                                row['p_value'], row['cv'], row['score']]

        dict[(row['protein'], row['phosphosite'])] = entry_info

    return dict


def check_if_exists(node, path):
    for element in path:
        protein = node.split('_')[0]
        if element[1] == protein or element == protein:
            return True
    return False


def topdown_path(rel_dict, obs_dict, start, path=[]):

    split = start.split('_')
    if len(split) > 1 and (split[0], split[1]) in obs_dict:

        p_info = obs_dict[(split[0],split[1])][:]
        p_info.append(split[2])
        p_info.append(split[3])
        path = path + [p_info]
    else:
        path = path + [start]

    curr_kinase = start.split('_')[0]
    if curr_kinase not in rel_dict:
        return [path]

    paths = []

    for node in rel_dict[curr_kinase]:
        prot_phosphosite_tuple = (node.split('_')[0], node.split('_')[1])
        if prot_phosphosite_tuple in obs_dict and not check_if_exists(node, path):
            newpaths = topdown_path(rel_dict, obs_dict, node, path)
            for newpath in newpaths:
                paths.append(newpath)
    return paths
