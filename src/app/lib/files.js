const { getInfo } = nw.require('youtube-dl')
const util = nw.require('util')
const getInfoPromise = util.promisify(getInfo)
const checkVideoInfo = async url => {
    const infos = await getInfoPromise(url)
    const videoThumbnailURL = infos.thumbnails[infos.thumbnails.length - 2]
    const modelizedFormats = modelizeFormats(infos.formats, url)
    return { modelizedFormats, videoThumbnailURL }
}

const modelizeFormats = (formats, url) => {
    const modelizedFormats = []

    for (let format of formats) {
        let audioOnly = format.fps === null
        let fileSizeBase = String(format.filesize / 1000000.0)
        let fileSize = fileSizeBase.substring(0, fileSizeBase.indexOf('.') + 3) + 'Mb'
        let videoHeight = format.height ? format.height + 'p' : null
        let videoHeightPixels = format.height ? format.height : null
        let formatId = format.format_id
        let fileFormat = format.ext
        const modelizedFormat = {
            url: url,
            audioOnly,
            formatId,
            videoHeight,
            videoHeightPixels,
            fileSize,
            fileSizeNumber: format.filesize / 1000000.0,
            fileFormat,
            formatMessage: `${audioOnly ? 'Audio' : 'Video ' + videoHeight}\nFile Size : ${fileSize}\nFile format : .${fileFormat} (id. ${formatId})\n`
        }
        if (fileSizeBase > 0) modelizedFormats.push(modelizedFormat)
    }

    modelizedFormats.sort((a, b) => {
        if (a.audioOnly && b.audioOnly) return a.fileSize - b.fileSize
        if (a.audioOnly && !b.audioOnly) return -1
        if (!a.audioOnly && b.audioOnly) return 1
        if (!a.audioOnly && !b.audioOnly) return a.videoHeightPixels - b.videoHeightPixels
    })
    return modelizedFormats
}

const generateOptions = formats => {
    const options = []

    const baseOption = document.createElement('OPTION')

    baseOption.value = ''
    baseOption.innerHTML = 'Please select the desired format...'

    options.push(baseOption)

    for (let format of formats) {
        const option = document.createElement('OPTION')
        option.data = {
            format: format,
            id: format.formatId
        }
        option.value = format.formatId
        option.innerHTML = format.formatMessage
        options.push(option)
    }

    return options
}

module.exports = {
    checkVideoInfo,
    generateOptions
}