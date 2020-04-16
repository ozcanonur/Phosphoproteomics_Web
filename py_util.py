import sqlite3
import pandas as pd


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