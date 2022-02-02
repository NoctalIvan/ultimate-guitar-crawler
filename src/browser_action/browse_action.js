const getTabUrl = () => new Promise(resolve => {
    chrome.tabs.getSelected(null, function(tab) {
        resolve(tab.url)
    })
})

const dlFile = (str, fileName, type) => {
    var a = document.createElement('a');
    var blob = new Blob([ str ], {type : `${type || 'text/plain'};charset=UTF-8`});
    a.href = window.URL.createObjectURL(blob);
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click(); //this is probably the key - simulating a click on a download link
    delete a;// we don't need this anymore
}

const onCsvExport = () => {
    if(!tabs) {
        return
    }

    let csv = 'artist,song,version,UG link,\n' + tabs.map(t => [t.band_name, t.song_name, t.version, t.song_url].join(',')).join('\n')
    dlFile(csv, 'ug-export.csv', 'text/csv')
}

const onJsonExport = () => {
    if(!tabs) {
        return
    }

    dlFile(JSON.stringify(tabs), 'ug-export.json', 'data/json')
}

const changeDisplay = (id) => {
    [...document.getElementsByClassName('conditional-content')].forEach(elem => elem.classList.add('hidden'))
    document.getElementById(id).classList.remove('hidden')
}

const analyseTabs = async () => {
    try {
        const res = await axios.get('https://www.ultimate-guitar.com/user/mytabs')
        const jsStore = res.data.match(/<div class="js-store" data-content="(.*)"/)[1]
        if(!jsStore) {
            return null
        }

        const parser = new DOMParser
        const dom = parser.parseFromString(
            '<!doctype html><body>' + jsStore,
            'text/html')
        const js = dom.body.textContent
        const data = JSON.parse(js)
        return data.store.page.data.list.list
    } catch (error) {
        console.error(error)
        return {error: error.message.match(/(\d\d\d)/)[1]}
    }
}

let lastUrl = 'dummy'
let tabs = null
const main = async () => {
    const url = await getTabUrl()
    if(url == lastUrl) {
        return
    }
    
    if(url && url.match(/https:\/\/www\.ultimate\-guitar\.com/)) {
        tabs = await analyseTabs()
        tabs.sort((t1, t2) => 
            t1.band_name.localeCompare(t2.band_name) || 
            t1.song_name.localeCompare(t2.song_name) ||
            t1.version - t2.version
        )
        if(tabs.error) {
            changeDisplay('error' + tabs.error)
            return
        }

        console.log(tabs)
        document.getElementById('importer').innerHTML = `
            <div>We found ${tabs.length} tabs on Ultimate Guitar!</div>
            <button style="margin-top: 10px" id="csvExport">Export to CSV</button>  
            <button style="margin-top: 10px" id="jsonExport">Export to JSON</button>  
        `
        document.getElementById('csvExport').onclick = onCsvExport
        document.getElementById('jsonExport').onclick = onJsonExport
        changeDisplay('importer')
    } else {
        changeDisplay('wrong-website')
    }
}

main()
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    main()
})